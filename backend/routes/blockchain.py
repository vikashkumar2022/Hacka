from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, FileRecord, VerificationLog, User, AuditLog
from web3 import Web3
import os
from datetime import datetime, timedelta
from sqlalchemy import func, and_, or_

blockchain_bp = Blueprint('blockchain', __name__)

def get_web3_connection():
    """Get Web3 connection."""
    try:
        provider_uri = os.environ.get('WEB3_PROVIDER_URI', 'http://localhost:8545')
        w3 = Web3(Web3.HTTPProvider(provider_uri))
        return w3 if w3.is_connected() else None
    except Exception as e:
        print(f"Web3 connection error: {e}")
        return None

@blockchain_bp.route('/status', methods=['GET'])
def blockchain_status():
    """Get blockchain connection status."""
    try:
        w3 = get_web3_connection()
        
        if w3:
            latest_block = w3.eth.get_block('latest')
            gas_price = w3.eth.gas_price
            
            return jsonify({
                'connected': True,
                'network_id': w3.eth.chain_id,
                'latest_block': latest_block.number,
                'gas_price': str(gas_price),
                'accounts': len(w3.eth.accounts) if hasattr(w3.eth, 'accounts') else 0
            }), 200
        else:
            return jsonify({
                'connected': False,
                'error': 'Unable to connect to blockchain'
            }), 503
            
    except Exception as e:
        return jsonify({
            'connected': False,
            'error': str(e)
        }), 500

@blockchain_bp.route('/contract-info', methods=['GET'])
def contract_info():
    """Get smart contract information."""
    try:
        contract_address = os.environ.get('CONTRACT_ADDRESS')
        
        if not contract_address:
            return jsonify({'error': 'Contract address not configured'}), 500
        
        w3 = get_web3_connection()
        if not w3:
            return jsonify({'error': 'Blockchain not connected'}), 503
        
        # Check if contract exists
        code = w3.eth.get_code(contract_address)
        contract_exists = len(code) > 0
        
        # Get contract balance (if needed)
        balance = w3.eth.get_balance(contract_address)
        
        return jsonify({
            'address': contract_address,
            'exists': contract_exists,
            'balance': str(balance),
            'network_id': w3.eth.chain_id
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@blockchain_bp.route('/transaction/<tx_hash>', methods=['GET'])
def get_transaction_info(tx_hash):
    """Get transaction information."""
    try:
        w3 = get_web3_connection()
        if not w3:
            return jsonify({'error': 'Blockchain not connected'}), 503
        
        # Get transaction
        tx = w3.eth.get_transaction(tx_hash)
        
        # Get transaction receipt
        try:
            receipt = w3.eth.get_transaction_receipt(tx_hash)
            confirmed = True
        except:
            receipt = None
            confirmed = False
        
        # Get current block for confirmations
        current_block = w3.eth.get_block('latest').number
        confirmations = current_block - tx.blockNumber if tx.blockNumber else 0
        
        transaction_info = {
            'hash': tx_hash,
            'from': tx['from'],
            'to': tx['to'],
            'value': str(tx['value']),
            'gas': tx['gas'],
            'gas_price': str(tx['gasPrice']),
            'block_number': tx.blockNumber,
            'confirmed': confirmed,
            'confirmations': confirmations,
            'status': None
        }
        
        if receipt:
            transaction_info.update({
                'gas_used': receipt['gasUsed'],
                'status': receipt['status'],  # 1 for success, 0 for failure
                'block_hash': receipt['blockHash'].hex(),
                'transaction_index': receipt['transactionIndex']
            })
        
        return jsonify(transaction_info), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@blockchain_bp.route('/gas-estimate', methods=['POST'])
def estimate_gas():
    """Estimate gas for a transaction."""
    try:
        data = request.get_json()
        
        w3 = get_web3_connection()
        if not w3:
            return jsonify({'error': 'Blockchain not connected'}), 503
        
        # Build transaction for estimation
        transaction = {
            'to': data.get('to'),
            'data': data.get('data', '0x'),
            'value': int(data.get('value', 0))
        }
        
        if data.get('from'):
            transaction['from'] = data['from']
        
        # Estimate gas
        gas_estimate = w3.eth.estimate_gas(transaction)
        current_gas_price = w3.eth.gas_price
        
        # Add 20% buffer to gas estimate
        gas_limit = int(gas_estimate * 1.2)
        
        # Calculate cost
        estimated_cost = gas_limit * current_gas_price
        
        return jsonify({
            'gas_estimate': gas_estimate,
            'gas_limit': gas_limit,
            'gas_price': str(current_gas_price),
            'estimated_cost': str(estimated_cost),
            'estimated_cost_eth': str(w3.from_wei(estimated_cost, 'ether'))
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@blockchain_bp.route('/network-stats', methods=['GET'])
def network_stats():
    """Get network statistics."""
    try:
        w3 = get_web3_connection()
        if not w3:
            return jsonify({'error': 'Blockchain not connected'}), 503
        
        latest_block = w3.eth.get_block('latest')
        gas_price = w3.eth.gas_price
        
        # Calculate average block time (simplified)
        prev_block = w3.eth.get_block(latest_block.number - 10)
        avg_block_time = (latest_block.timestamp - prev_block.timestamp) / 10
        
        return jsonify({
            'chain_id': w3.eth.chain_id,
            'latest_block_number': latest_block.number,
            'latest_block_hash': latest_block.hash.hex(),
            'gas_price': str(gas_price),
            'gas_price_gwei': str(w3.from_wei(gas_price, 'gwei')),
            'avg_block_time': avg_block_time,
            'block_gas_limit': latest_block.gasLimit,
            'block_gas_used': latest_block.gasUsed,
            'network_utilization': (latest_block.gasUsed / latest_block.gasLimit) * 100
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@blockchain_bp.route('/verify-contract', methods=['POST'])
@jwt_required()
def verify_contract_deployment():
    """Verify that the smart contract is properly deployed."""
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()
        
        contract_address = data.get('contract_address') or os.environ.get('CONTRACT_ADDRESS')
        
        if not contract_address:
            return jsonify({'error': 'Contract address required'}), 400
        
        w3 = get_web3_connection()
        if not w3:
            return jsonify({'error': 'Blockchain not connected'}), 503
        
        # Check if contract exists
        code = w3.eth.get_code(contract_address)
        
        if len(code) <= 2:  # '0x' or empty
            return jsonify({
                'verified': False,
                'error': 'No contract found at address'
            }), 400
        
        # Try to call a simple function to verify ABI compatibility
        # This would require the contract ABI, which should be stored or imported
        
        verification_result = {
            'verified': True,
            'contract_address': contract_address,
            'network_id': w3.eth.chain_id,
            'code_size': len(code),
            'verified_at': datetime.utcnow().isoformat()
        }
        
        # Log verification
        audit_log = AuditLog(
            action='contract_verified',
            resource_type='blockchain',
            resource_id=contract_address,
            user_id=current_user_id,
            ip_address=request.remote_addr,
            user_agent=request.headers.get('User-Agent')
        )
        audit_log.set_details(verification_result)
        
        db.session.add(audit_log)
        db.session.commit()
        
        return jsonify(verification_result), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@blockchain_bp.route('/sync-files', methods=['POST'])
@jwt_required()
def sync_blockchain_files():
    """Sync files between database and blockchain."""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user or not user.is_admin:
            return jsonify({'error': 'Admin access required'}), 403
        
        w3 = get_web3_connection()
        if not w3:
            return jsonify({'error': 'Blockchain not connected'}), 503
        
        # This would require contract ABI and event filtering
        # For now, return a placeholder response
        
        sync_result = {
            'synced_files': 0,
            'new_files': 0,
            'updated_files': 0,
            'sync_time': datetime.utcnow().isoformat()
        }
        
        return jsonify(sync_result), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@blockchain_bp.route('/events', methods=['GET'])
@jwt_required()
def get_contract_events():
    """Get contract events (file uploads, verifications)."""
    try:
        from_block = request.args.get('from_block', 'latest')
        to_block = request.args.get('to_block', 'latest')
        event_type = request.args.get('event_type', 'all')
        
        w3 = get_web3_connection()
        if not w3:
            return jsonify({'error': 'Blockchain not connected'}), 503
        
        # This would require contract ABI and event filtering
        # For now, return database events that correspond to blockchain events
        
        query = AuditLog.query.filter(
            AuditLog.action.in_(['file_uploaded', 'file_verified']),
            AuditLog.resource_type == 'file'
        ).order_by(AuditLog.timestamp.desc()).limit(50)
        
        events = []
        for log in query:
            events.append({
                'event_type': log.action,
                'resource_id': log.resource_id,
                'user_id': log.user_id,
                'timestamp': log.timestamp.isoformat(),
                'details': log.get_details()
            })
        
        return jsonify({
            'events': events,
            'count': len(events)
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
