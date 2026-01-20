#!/bin/bash
# Test script to verify startup process

echo "============================================================" >&2
echo "STARTUP TEST SCRIPT RUNNING" >&2
echo "============================================================" >&2
echo "Current directory: $(pwd)" >&2
echo "Python version: $(python --version)" >&2
echo "Files in current dir:" >&2
ls -la | head -10 >&2
echo "============================================================" >&2

# Test if run_migration.py exists
if [ -f "run_migration.py" ]; then
    echo "✅ run_migration.py exists" >&2
    echo "Running run_migration.py..." >&2
    python run_migration.py 2>&1
    EXIT_CODE=$?
    echo "Migration script exited with code: $EXIT_CODE" >&2
    if [ $EXIT_CODE -ne 0 ]; then
        echo "❌ Migration script failed!" >&2
        exit 1
    fi
else
    echo "❌ run_migration.py not found!" >&2
    exit 1
fi

echo "============================================================" >&2
echo "STARTUP TEST COMPLETE" >&2
echo "============================================================" >&2

