from flask import Flask
from flask_login import LoginManager
from config import Config
from models import db, Admin
from routes import main_bp

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    # Attach SQLAlchemy
    db.init_app(app)

    # Attach Flask-Login
    login_manager = LoginManager()
    login_manager.init_app(app)
    login_manager.login_view = 'main.login_page'

    @login_manager.user_loader
    def load_user(user_id):
        return Admin.query.get(int(user_id))

    # Connect Blueprint
    app.register_blueprint(main_bp)

    # Instantly build local database tables upon launching
    with app.app_context():
        db.create_all()

    return app

if __name__ == '__main__':
    app = create_app()
    app.run(debug=True)