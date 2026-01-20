#!/usr/bin/env python3
"""
Quick script to uncomment rate limiting code after migration
Run this after: flask db upgrade

Usage:
    python3 scripts/uncomment_rate_limiting.py
"""

import re
import sys
import os

def uncomment_user_model():
    """Uncomment rate limiting fields and methods in models/user.py"""
    filepath = 'models/user.py'
    print(f"📝 Processing {filepath}...")
    
    try:
        with open(filepath, 'r') as f:
            content = f.read()
        
        original_content = content
        
        # Uncomment rate limiting fields (lines 26-28)
        content = re.sub(
            r'# TODO: Uncomment after running: flask db upgrade\n    # (daily_ai_analyses = db\.Column\(db\.Integer, default=0\).*?)\n    # (last_analysis_reset = db\.Column\(db\.Date, default=datetime\.utcnow\(\)\.*?)\n',
            r'\1\n    \2\n',
            content,
            flags=re.DOTALL
        )
        
        # Uncomment the three methods (can_analyze, increment_analysis_count, get_analysis_usage)
        # Remove TODO comment before methods
        content = re.sub(
            r'    # TODO: Uncomment after running: flask db upgrade\n    # def can_analyze\(self\):',
            r'    def can_analyze(self):',
            content
        )
        
        # Uncomment all lines in the three methods (lines starting with #     def, #         , etc.)
        # This is a bit tricky - we'll uncomment the entire block
        method_block_pattern = r'    # def can_analyze\(self\):(.*?)(?=\n    # def increment_analysis_count|\n    def to_dict|\n    # def get_analysis_usage)'
        
        # Better approach: uncomment all lines that are part of the commented methods
        # Find the block from "# def can_analyze" to just before "# def to_dict" or uncommented "def to_dict"
        def uncomment_method_block(match):
            block = match.group(0)
            # Remove leading "# " from each line, but preserve indentation
            lines = block.split('\n')
            uncommented_lines = []
            for line in lines:
                if line.strip().startswith('# def ') or line.strip().startswith('#         ') or line.strip().startswith('#     ') or line.strip().startswith('# '):
                    # Remove leading "# " but keep indentation
                    if line.startswith('    # '):
                        uncommented_lines.append('    ' + line[6:])  # Remove "    # "
                    elif line.startswith('        # '):
                        uncommented_lines.append('        ' + line[10:])  # Remove "        # "
                    elif line.startswith('# '):
                        uncommented_lines.append(line[2:])  # Remove "# "
                    else:
                        uncommented_lines.append(line)
                else:
                    uncommented_lines.append(line)
            return '\n'.join(uncommented_lines)
        
        # Uncomment the entire block from "# def can_analyze" to before "def to_dict"
        content = re.sub(
            r'(    # TODO: Uncomment after running: flask db upgrade\n    # def can_analyze\(self\):.*?)(\n    def to_dict)',
            lambda m: uncomment_method_block(m) + m.group(2),
            content,
            flags=re.DOTALL
        )
        
        # Remove remaining TODO comments
        content = re.sub(r'    # TODO: Uncomment after running: flask db upgrade\n', '', content)
        
        # Simple approach: just remove "# " from lines that are clearly part of the methods
        # Uncomment daily_ai_analyses field
        content = re.sub(
            r'    # daily_ai_analyses = db\.Column\(db\.Integer, default=0\)  # Counter for daily AI analyses',
            r'    daily_ai_analyses = db.Column(db.Integer, default=0)  # Counter for daily AI analyses',
            content
        )
        
        # Uncomment last_analysis_reset field
        content = re.sub(
            r'    # last_analysis_reset = db\.Column\(db\.Date, default=datetime\.utcnow\(\)\)  # Date of last counter reset',
            r'    last_analysis_reset = db.Column(db.Date, default=datetime.utcnow)  # Date of last counter reset',
            content
        )
        
        # Uncomment method definitions and their bodies
        # Replace "# def " with "def "
        content = re.sub(r'    # def (can_analyze|increment_analysis_count|get_analysis_usage)\(', r'    def \1(', content)
        
        # Uncomment method body lines (lines that start with "#         " or "#     ")
        def uncomment_indented_line(match):
            line = match.group(0)
            if line.startswith('    #         '):
                return '            ' + line[13:]  # Remove "    #         " and add proper indentation
            elif line.startswith('    #     '):
                return '        ' + line[9:]  # Remove "    #     "
            elif line.startswith('        # '):
                return '        ' + line[9:]  # Remove "        # "
            return line
        
        # Uncomment indented lines in method bodies
        content = re.sub(r'    #         .*', uncomment_indented_line, content, flags=re.MULTILINE)
        content = re.sub(r'    #     .*', uncomment_indented_line, content, flags=re.MULTILINE)
        content = re.sub(r'        # .*', uncomment_indented_line, content, flags=re.MULTILINE)
        
        if content != original_content:
            with open(filepath, 'w') as f:
                f.write(content)
            print(f"✅ {filepath} updated - rate limiting fields and methods uncommented")
            return True
        else:
            print(f"⚠️  {filepath} - no changes needed (may already be uncommented)")
            return False
            
    except Exception as e:
        print(f"❌ Error processing {filepath}: {e}")
        import traceback
        traceback.print_exc()
        return False

def uncomment_api_routes():
    """Uncomment rate limiting checks in api/options.py"""
    filepath = 'api/options.py'
    print(f"📝 Processing {filepath}...")
    
    try:
        with open(filepath, 'r') as f:
            content = f.read()
        
        original_content = content
        
        # Uncomment the rate limit check block
        # Find the commented block that starts with "# TODO: Uncomment after running: flask db upgrade"
        # and contains the rate limit check
        content = re.sub(
            r'    # TODO: Uncomment after running: flask db upgrade\n    # Check rate limit if user is authenticated.*?#         pass\n',
            lambda m: m.group(0).replace('# TODO: Uncomment after running: flask db upgrade\n    # ', '').replace('#     ', '    ').replace('#         ', '        ').replace('#         ', '        '),
            content,
            flags=re.DOTALL
        )
        
        # Better: manually uncomment the specific blocks
        # Uncomment rate limit check
        content = re.sub(
            r'    # TODO: Uncomment after running: flask db upgrade\n    # Check rate limit if user is authenticated.*?#         pass\n',
            lambda m: '    # Check rate limit if user is authenticated (before cache check to avoid cache hits for rate-limited users)\n' +
                     m.group(0).replace('# TODO: Uncomment after running: flask db upgrade\n    # ', '').replace('#     ', '    ').replace('#         ', '        ').replace('# TODO: Uncomment after running: flask db upgrade\n    # ', ''),
            content,
            flags=re.DOTALL
        )
        
        # Simpler approach: just find and replace the commented sections
        # Uncomment the rate limit check block
        rate_limit_check = r'    # TODO: Uncomment after running: flask db upgrade\n    # Check rate limit if user is authenticated.*?pass\n'
        replacement = '''    # Check rate limit if user is authenticated (before cache check to avoid cache hits for rate-limited users)
    if current_user:
        try:
            if not current_user.can_analyze():
                usage = current_user.get_analysis_usage()
                return jsonify({
                    'error': 'Daily analysis limit reached',
                    'message': f"You've used all {usage['limit']} AI analyses for today. Resets at midnight EST.",
                    'usage': usage
                }), 429
        except AttributeError:
            # User model doesn't have rate limiting yet - skip check
            pass
'''
        
        content = re.sub(rate_limit_check, replacement, content, flags=re.DOTALL)
        
        # Uncomment the increment call
        increment_block = r'        # TODO: Uncomment after running: flask db upgrade\n        # Increment rate limit counter if user is authenticated.*?pass\n'
        increment_replacement = '''        # Increment rate limit counter if user is authenticated
        if current_user:
            try:
                current_user.increment_analysis_count()
            except AttributeError:
                # User model doesn't have rate limiting yet - skip
                pass
'''
        
        content = re.sub(increment_block, increment_replacement, content, flags=re.DOTALL)
        
        if content != original_content:
            with open(filepath, 'w') as f:
                f.write(content)
            print(f"✅ {filepath} updated - rate limiting checks uncommented")
            return True
        else:
            print(f"⚠️  {filepath} - no changes needed (may already be uncommented)")
            return False
            
    except Exception as e:
        print(f"❌ Error processing {filepath}: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    print("=" * 60)
    print("🔧 Re-enabling Rate Limiting Code")
    print("=" * 60)
    print()
    print("⚠️  IMPORTANT: Run 'flask db upgrade' on Railway first!")
    print()
    
    # Verify migration first
    print("Step 1: Verifying migration status...")
    try:
        from app import create_app, db
        from sqlalchemy import inspect
        
        app = create_app()
        with app.app_context():
            inspector = inspect(db.engine)
            tables = inspector.get_table_names()
            user_columns = [c['name'] for c in inspector.get_columns('users')]
            
            if 'spreads' not in tables or 'daily_ai_analyses' not in user_columns:
                print("❌ ERROR: Migration not run yet!")
                print("   Run 'flask db upgrade' on Railway first.")
                sys.exit(1)
            
            print("✅ Migration verified - database ready")
    except Exception as e:
        print(f"⚠️  Could not verify migration: {e}")
        print("   Continuing anyway, but make sure migration ran first!")
        response = input("Continue? (y/n): ")
        if response.lower() != 'y':
            sys.exit(1)
    
    print()
    print("Step 2: Uncommenting rate limiting code...")
    print()
    
    success = True
    success &= uncomment_user_model()
    print()
    success &= uncomment_api_routes()
    
    print()
    print("=" * 60)
    if success:
        print("✅ Rate limiting code re-enabled successfully!")
        print()
        print("Next steps:")
        print("1. Review changes: git diff")
        print("2. Test locally (optional): python3 -c 'from models.user import User; print(User.can_analyze)'")
        print("3. Commit: git add -A && git commit -m 'feat: Re-enable rate limiting after database migration'")
        print("4. Push: git push")
        print("5. Railway will auto-deploy")
        print("6. Test rate limiting: Make 101 analysis requests")
    else:
        print("⚠️  Some files may not have been updated")
        print("   Please manually uncomment the rate limiting code")
        print("   See MIGRATION_GUIDE.md for instructions")
        sys.exit(1)

if __name__ == '__main__':
    main()

