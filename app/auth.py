"""
Authentication Manager for MedRAG
Handles user registration, login, session management, and password changes
Uses MongoDB for user storage
"""

import hashlib
import secrets
from datetime import datetime, timedelta
from typing import Optional, Dict
from pymongo import MongoClient
from pymongo.errors import DuplicateKeyError
import re


class AuthManager:
    def __init__(self, mongodb_uri: str, db_name: str):
        """Initialize authentication manager with MongoDB connection"""
        self.client = MongoClient(mongodb_uri)
        self.db = self.client[db_name]
        self.users = self.db.users
        self.sessions = self.db.sessions
        
        # Create indexes (skip if already exist)
        try:
            self.users.create_index("email", unique=True)
        except Exception:
            pass  # Index already exists
        
        try:
            self.sessions.create_index("session_token", unique=True)
        except Exception:
            pass  # Index already exists
        
        try:
            self.sessions.create_index("expires_at")
        except Exception:
            pass  # Index already exists
    
    def _hash_password(self, password: str) -> str:
        """Hash password using SHA-256"""
        return hashlib.sha256(password.encode()).hexdigest()
    
    def _validate_email(self, email: str) -> bool:
        """Validate email format"""
        pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        return re.match(pattern, email) is not None
    
    def _validate_password(self, password: str) -> tuple[bool, str]:
        """Validate password strength"""
        if len(password) < 8:
            return False, "Password must be at least 8 characters"
        if not re.search(r'[A-Za-z]', password):
            return False, "Password must contain letters"
        if not re.search(r'\d', password):
            return False, "Password must contain numbers"
        return True, ""
    
    def register_user(self, email: str, password: str, full_name: str) -> Dict:
        """Register a new user"""
        try:
            # Validate email
            if not self._validate_email(email):
                return {"success": False, "error": "Invalid email format"}
            
            # Validate password
            valid, error = self._validate_password(password)
            if not valid:
                return {"success": False, "error": error}
            
            # Validate name
            if not full_name or len(full_name.strip()) < 2:
                return {"success": False, "error": "Name must be at least 2 characters"}
            
            # Hash password
            password_hash = self._hash_password(password)
            
            # Create user document
            user_doc = {
                "email": email.lower().strip(),
                "password_hash": password_hash,
                "full_name": full_name.strip(),
                "created_at": datetime.utcnow(),
                "last_login": None
            }
            
            # Insert user
            result = self.users.insert_one(user_doc)
            
            return {
                "success": True,
                "user_id": str(result.inserted_id),
                "message": "Registration successful"
            }
            
        except DuplicateKeyError:
            return {"success": False, "error": "Email already registered"}
        except Exception as e:
            return {"success": False, "error": f"Registration failed: {str(e)}"}
    
    def login_user(self, email: str, password: str) -> Dict:
        """Login user and create session"""
        try:
            # Find user
            user = self.users.find_one({"email": email.lower().strip()})
            if not user:
                return {"success": False, "error": "Invalid email or password"}
            
            # Verify password
            password_hash = self._hash_password(password)
            if password_hash != user["password_hash"]:
                return {"success": False, "error": "Invalid email or password"}
            
            # Create session token
            session_token = secrets.token_urlsafe(32)
            expires_at = datetime.utcnow() + timedelta(days=7)
            
            # Store session
            session_doc = {
                "session_token": session_token,
                "user_id": str(user["_id"]),
                "email": user["email"],
                "created_at": datetime.utcnow(),
                "expires_at": expires_at
            }
            self.sessions.insert_one(session_doc)
            
            # Update last login
            self.users.update_one(
                {"_id": user["_id"]},
                {"$set": {"last_login": datetime.utcnow()}}
            )
            
            return {
                "success": True,
                "session_token": session_token,
                "user": {
                    "user_id": str(user["_id"]),
                    "email": user["email"],
                    "full_name": user["full_name"]
                }
            }
            
        except Exception as e:
            return {"success": False, "error": f"Login failed: {str(e)}"}
    
    def verify_session(self, session_token: str) -> Optional[Dict]:
        """Verify session token and return user info"""
        try:
            session = self.sessions.find_one({"session_token": session_token})
            if not session:
                return None
            
            # Check expiration
            if session["expires_at"] < datetime.utcnow():
                self.sessions.delete_one({"session_token": session_token})
                return None
            
            # Get user info
            user = self.users.find_one({"email": session["email"]})
            if not user:
                return None
            
            return {
                "user_id": str(user["_id"]),
                "email": user["email"],
                "full_name": user["full_name"]
            }
            
        except Exception:
            return None
    
    def logout_user(self, session_token: str) -> Dict:
        """Logout user by deleting session"""
        try:
            result = self.sessions.delete_one({"session_token": session_token})
            return {
                "success": result.deleted_count > 0,
                "message": "Logged out successfully"
            }
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def get_user_info(self, user_id: str) -> Optional[Dict]:
        """Get user information by user_id"""
        try:
            from bson.objectid import ObjectId
            user = self.users.find_one({"_id": ObjectId(user_id)})
            if not user:
                return None
            
            return {
                "user_id": str(user["_id"]),
                "email": user["email"],
                "full_name": user["full_name"],
                "created_at": user["created_at"].isoformat() if user.get("created_at") else None,
                "last_login": user["last_login"].isoformat() if user.get("last_login") else None
            }
        except Exception:
            return None
    
    def change_password(self, user_id: str, old_password: str, new_password: str) -> Dict:
        """Change user password"""
        try:
            from bson.objectid import ObjectId
            
            # Get user
            user = self.users.find_one({"_id": ObjectId(user_id)})
            if not user:
                return {"success": False, "error": "User not found"}
            
            # Verify old password
            old_hash = self._hash_password(old_password)
            if old_hash != user["password_hash"]:
                return {"success": False, "error": "Current password is incorrect"}
            
            # Validate new password
            valid, error = self._validate_password(new_password)
            if not valid:
                return {"success": False, "error": error}
            
            # Update password
            new_hash = self._hash_password(new_password)
            self.users.update_one(
                {"_id": ObjectId(user_id)},
                {"$set": {"password_hash": new_hash}}
            )
            
            # Delete all sessions for this user (force re-login)
            self.sessions.delete_many({"user_id": user_id})
            
            return {"success": True, "message": "Password changed successfully"}
            
        except Exception as e:
            return {"success": False, "error": f"Password change failed: {str(e)}"}
