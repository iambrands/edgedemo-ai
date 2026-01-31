"""Beta code model for controlled registration (optionsedge.ai beta)."""
from app import db
from datetime import datetime


class BetaCode(db.Model):
    __tablename__ = 'beta_codes'

    id = db.Column(db.Integer, primary_key=True)
    code = db.Column(db.String(50), unique=True, nullable=False, index=True)
    description = db.Column(db.String(255))  # e.g., "Product Hunt Launch", "Friends & Family"

    # Usage limits
    max_uses = db.Column(db.Integer, default=100)  # 0 = unlimited
    current_uses = db.Column(db.Integer, default=0)

    # Validity period
    valid_from = db.Column(db.DateTime, default=datetime.utcnow)
    valid_until = db.Column(db.DateTime, nullable=True)  # None = never expires

    # Status
    is_active = db.Column(db.Boolean, default=True)

    # Tracking
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)

    def is_valid(self):
        """Check if code can be used right now."""
        if not self.is_active:
            return False
        if self.max_uses > 0 and self.current_uses >= self.max_uses:
            return False
        now = datetime.utcnow()
        if self.valid_from and now < self.valid_from:
            return False
        if self.valid_until and now > self.valid_until:
            return False
        return True

    def use(self):
        """Increment usage counter."""
        self.current_uses += 1
        db.session.commit()


class BetaCodeUsage(db.Model):
    """Track which user used which code."""
    __tablename__ = 'beta_code_usage'

    id = db.Column(db.Integer, primary_key=True)
    beta_code_id = db.Column(db.Integer, db.ForeignKey('beta_codes.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    used_at = db.Column(db.DateTime, default=datetime.utcnow)

    beta_code = db.relationship('BetaCode', backref='usages')
    user = db.relationship('User', backref=db.backref('beta_code_usages', lazy='dynamic'))
