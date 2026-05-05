import os

class Config:
    # Used by Flask to securely sign session cookies
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'change-this-in-production-12345'
    
    # Path to the local SQLite database file
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or 'sqlite:///qatar_foundation.db'
    SQLALCHEMY_TRACK_MODIFICATIONS = False