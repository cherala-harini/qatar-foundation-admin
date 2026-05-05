import secrets
from datetime import datetime, timedelta
from flask import Blueprint, render_template, request, jsonify, redirect, url_for
from flask_login import login_user, logout_user, login_required, current_user
from werkzeug.security import generate_password_hash, check_password_hash
from email_validator import validate_email, EmailNotValidError

from models import db, Admin, Opportunity, PasswordResetToken

main_bp = Blueprint('main', __name__)

# Valid categories matching the dashboard HTML select options
ALLOWED_CATEGORIES = ["Technology", "Business", "Design", "Marketing", "Data Science", "Other"]

# ==========================================
# PAGE ROUTING
# ==========================================
@main_bp.route('/')
def home():
    if current_user.is_authenticated:
        return redirect(url_for('main.dashboard'))
    return redirect(url_for('main.login_page'))

@main_bp.route('/login')
def login_page():
    return render_template('login.html')

@main_bp.route('/dashboard')
@login_required
def dashboard():
    return render_template('dashboard.html')


# ==========================================
# AUTHENTICATION ENDPOINTS
# ==========================================
@main_bp.route('/api/signup', methods=['POST'])
def signup():
    data = request.get_json() or {}
    full_name = data.get('full_name', '').strip()
    email = data.get('email', '').strip()
    password = data.get('password', '').strip()
    confirm_password = data.get('confirm_password', '').strip()

    if not all([full_name, email, password, confirm_password]):
        return jsonify({"error": "All fields are required"}), 400
    if password != confirm_password:
        return jsonify({"error": "Passwords do not match"}), 400
    if len(password) < 8:
        return jsonify({"error": "Password must be at least 8 characters long"}), 400

    try:
        validate_email(email)
    except EmailNotValidError:
        return jsonify({"error": "Invalid email format"}), 400

    if Admin.query.filter_by(email=email).first():
        return jsonify({"error": "Email is already registered"}), 409

    hashed_pw = generate_password_hash(password, method='scrypt')
    new_admin = Admin(full_name=full_name, email=email, password_hash=hashed_pw)
    db.session.add(new_admin)
    db.session.commit()

    return jsonify({"status": "success", "message": "Admin account created"}), 201


@main_bp.route('/api/login', methods=['POST'])
def login():
    data = request.get_json() or {}
    email = data.get('email', '').strip()
    password = data.get('password', '').strip()
    # Fix: read remember flag from frontend
    remember = bool(data.get('remember', False))

    if not email or not password:
        return jsonify({"error": "Email and password are required"}), 400

    user = Admin.query.filter_by(email=email).first()
    if not user or not check_password_hash(user.password_hash, password):
        return jsonify({"error": "Invalid email or password"}), 401

    login_user(user, remember=remember)
    return jsonify({"status": "success", "message": "Logged in successfully"}), 200


@main_bp.route('/api/logout', methods=['POST'])
@login_required
def logout():
    logout_user()
    return jsonify({"status": "success", "message": "Logged out successfully"}), 200


@main_bp.route('/api/forgot-password', methods=['POST'])
def forgot_password():
    print("\n--- FORGOT PASSWORD API TRIGGERED ---")

    data = request.get_json() or {}
    email = data.get('email', '').strip()

    if not email:
        return jsonify({"error": "Email is required"}), 400

    user = Admin.query.filter_by(email=email).first()

    if user:
        # Fix: store token with 1-hour expiry in DB (US-1.3)
        reset_token = secrets.token_urlsafe(32)
        expires_at = datetime.utcnow() + timedelta(hours=1)

        token_record = PasswordResetToken(
            token=reset_token,
            admin_id=user.id,
            expires_at=expires_at
        )
        db.session.add(token_record)
        db.session.commit()

        print("\n" + "=" * 60)
        print(f"[PASSWORD RESET] Reset link for {email}:")
        print(f"http://127.0.0.1:5000/reset-password?token={reset_token}")
        print(f"Expires at: {expires_at} UTC")
        print("=" * 60 + "\n")
    else:
        print(f"Warning: Email '{email}' not found in database.")

    # Always same response to prevent email enumeration (US-1.3)
    return jsonify({
        "status": "success",
        "message": "If that email exists, a password reset link has been generated."
    }), 200


# Fix: reset-password page + API endpoint (US-1.3)
@main_bp.route('/reset-password')
def reset_password_page():
    token = request.args.get('token', '').strip()
    if not token:
        return render_template('reset_password.html', error="No reset token provided.")

    record = PasswordResetToken.query.filter_by(token=token, used=False).first()
    if not record:
        return render_template('reset_password.html', error="Invalid or already-used reset link.")
    if record.is_expired():
        return render_template('reset_password.html', error="This reset link has expired. Please request a new one.")

    return render_template('reset_password.html', token=token)


@main_bp.route('/api/reset-password', methods=['POST'])
def reset_password():
    data = request.get_json() or {}
    token = data.get('token', '').strip()
    new_password = data.get('new_password', '').strip()
    confirm_password = data.get('confirm_password', '').strip()

    if not token or not new_password or not confirm_password:
        return jsonify({"error": "All fields are required"}), 400
    if new_password != confirm_password:
        return jsonify({"error": "Passwords do not match"}), 400
    if len(new_password) < 8:
        return jsonify({"error": "Password must be at least 8 characters long"}), 400

    record = PasswordResetToken.query.filter_by(token=token, used=False).first()
    if not record:
        return jsonify({"error": "Invalid or already-used reset link."}), 400
    if record.is_expired():
        return jsonify({"error": "This reset link has expired. Please request a new one."}), 400

    admin = Admin.query.get(record.admin_id)
    admin.password_hash = generate_password_hash(new_password, method='scrypt')
    record.used = True
    db.session.commit()

    return jsonify({"status": "success", "message": "Password reset successfully."}), 200


# ==========================================
# OPPORTUNITIES CRUD
# ==========================================
@main_bp.route('/api/opportunities', methods=['GET'])
@login_required
def get_opportunities():
    user_ops = Opportunity.query.filter_by(admin_id=current_user.id).all()
    return jsonify({"status": "success", "data": [op.to_dict() for op in user_ops]}), 200


@main_bp.route('/api/opportunities', methods=['POST'])
@login_required
def create_opportunity():
    data = request.get_json() or {}
    name = data.get('name', '').strip()
    duration = data.get('duration', '').strip()
    start_date = data.get('start_date', '').strip()
    description = data.get('description', '').strip()
    skills = data.get('skills', '').strip()
    category = data.get('category', '').strip()
    # Fix: future_opportunities is required; max_applicants is optional
    future_opportunities = data.get('future_opportunities', '').strip()
    max_applicants_raw = data.get('max_applicants', '').strip() if data.get('max_applicants') else ''

    if not all([name, duration, start_date, description, skills, category, future_opportunities]):
        return jsonify({"error": "All required fields must be completed"}), 400

    max_applicants_int = None
    if max_applicants_raw:
        try:
            max_applicants_int = int(max_applicants_raw)
            if max_applicants_int < 1:
                return jsonify({"error": "Max applicants must be a positive number"}), 400
        except ValueError:
            return jsonify({"error": "Max applicants must be a whole number"}), 400

    new_op = Opportunity(
        name=name,
        duration=duration,
        start_date=start_date,
        description=description,
        skills=skills,
        category=category,
        future_opportunities=future_opportunities,
        max_applicants=max_applicants_int,
        admin_id=current_user.id
    )
    db.session.add(new_op)
    db.session.commit()

    return jsonify({"status": "success", "message": "Opportunity created", "data": new_op.to_dict()}), 201


@main_bp.route('/api/opportunities/<int:op_id>', methods=['GET'])
@login_required
def get_opportunity(op_id):
    op = Opportunity.query.get_or_404(op_id)
    if op.admin_id != current_user.id:
        return jsonify({"error": "Access denied"}), 403
    return jsonify({"status": "success", "data": op.to_dict()}), 200


@main_bp.route('/api/opportunities/<int:op_id>', methods=['PUT'])
@login_required
def edit_opportunity(op_id):
    op = Opportunity.query.get_or_404(op_id)
    if op.admin_id != current_user.id:
        return jsonify({"error": "Access denied"}), 403

    data = request.get_json() or {}

    # Validate non-empty for required fields if present in payload
    required_fields = ['name', 'duration', 'start_date', 'description', 'skills', 'future_opportunities']
    for field in required_fields:
        if field in data and not str(data[field]).strip():
            return jsonify({"error": f"'{field}' cannot be empty"}), 400

    op.name = data.get('name', op.name).strip()
    op.duration = data.get('duration', op.duration).strip()
    op.start_date = data.get('start_date', op.start_date).strip()
    op.description = data.get('description', op.description).strip()
    op.skills = data.get('skills', op.skills).strip()
    op.future_opportunities = data.get('future_opportunities', op.future_opportunities)

    if 'category' in data:
        op.category = data['category'].strip()

    if 'max_applicants' in data:
        raw = data['max_applicants']
        if raw == '' or raw is None:
            op.max_applicants = None
        else:
            try:
                val = int(raw)
                if val < 1:
                    return jsonify({"error": "Max applicants must be a positive number"}), 400
                op.max_applicants = val
            except (ValueError, TypeError):
                return jsonify({"error": "Max applicants must be a whole number"}), 400

    db.session.commit()
    return jsonify({"status": "success", "message": "Opportunity updated", "data": op.to_dict()}), 200


@main_bp.route('/api/opportunities/<int:op_id>', methods=['DELETE'])
@login_required
def delete_opportunity(op_id):
    op = Opportunity.query.get_or_404(op_id)
    if op.admin_id != current_user.id:
        return jsonify({"error": "Access denied"}), 403

    db.session.delete(op)
    db.session.commit()
    return jsonify({"status": "success", "message": "Opportunity deleted successfully"}), 200