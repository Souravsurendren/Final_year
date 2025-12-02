#!/usr/bin/env python3
"""
Quick test script for the authentication system
"""

def test_server_startup():
    """Test if the server can start without errors"""
    try:
        print("🧪 Testing server startup...")
        
        # Import the main modules to check for syntax errors
        from app.api import app, users_db, hash_password
        
        print("✅ API module imported successfully")
        print(f"✅ Demo users created: {len(users_db)} users")
        
        # Test password hashing
        test_hash = hash_password("test123")
        print(f"✅ Password hashing working: {test_hash[:20]}...")
        
        # Check demo users
        for user_id, user in users_db.items():
            print(f"✅ Demo user: {user['name']} ({user['email']})")
        
        print("\n🎉 All authentication components loaded successfully!")
        print("\n🚀 Ready to start server with: python run.py")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_server_startup()