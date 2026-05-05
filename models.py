from flask_sqlalchemy import SQLAlchemy
from flask_login import UserMixin
from datetime import datetime

db = SQLAlchemy()


class PasswordResetToken(db.Model):
    __tablename__ = 'password_reset_tokens'

    id = db.Column(db.Integer, primary_key=True)
    token = db.Column(db.String(128), unique=True, nullable=False)
    admin_id = db.Column(db.Integer, db.ForeignKey('admins.id'), nullable=False)
    expires_at = db.Column(db.DateTime, nullable=False)
    used = db.Column(db.Boolean, default=False, nullable=False)

    def is_expired(self):
        return datetime.utcnow() > self.expires_at

class Admin(UserMixin, db.Model):
    __tablename__ = 'admins'
    
    id = db.Column(db.Integer, primary_key=True)
    full_name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)

    # Relationship: Connects an Admin to many Opportunities
    opportunities = db.relationship('Opportunity', backref='creator', lazy=True, cascade="all, delete-orphan")


class Opportunity(db.Model):
    __tablename__ = 'opportunities'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(150), nullable=False)
    duration = db.Column(db.String(100), nullable=False)
    start_date = db.Column(db.String(50), nullable=False)
    description = db.Column(db.Text, nullable=False)
    skills = db.Column(db.String(255), nullable=False)
    category = db.Column(db.String(100), nullable=False)
    future_opportunities = db.Column(db.Text, nullable=True)
    # Fix: max_applicants is optional per PDF spec (US-2.2)
    max_applicants = db.Column(db.Integer, nullable=True)
    
    # Foreign Key linking back to the logged-in Admin
    admin_id = db.Column(db.Integer, db.ForeignKey('admins.id'), nullable=False)

    def to_dict(self):
        """Helper to convert the object into JSON for API endpoints."""
        return {
            'id': self.id,
            'name': self.name,
            'duration': self.duration,
            'start_date': self.start_date,
            'description': self.description,
            'skills': self.skills,
            'category': self.category,
            'future_opportunities': self.future_opportunities,
            'max_applicants': self.max_applicants if self.max_applicants is not None else 'Unlimited',
            'admin_id': self.admin_id
        }