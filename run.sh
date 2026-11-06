#!/usr/bin/env bash
# Titanic Survival Predictor - Startup Script

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
cd "$DIR"

echo "=========================================================="
echo "      TITANIC: TAQDIR SINOVI - AI VEB-PLATFORMASI"
echo "=========================================================="

if [ ! -d ".venv" ]; then
    echo "[!] .venv muhiti topilmadi. Yaratilmoqda..."
    python3 -m venv .venv
    .venv/bin/pip install -r requirements.txt
fi

if [ ! -f "best_titanic_model.joblib" ]; then
    echo "[*] Model mavjud emas. GridSearchCV orqali modellar o'qitilmoqda..."
    .venv/bin/python3 train_and_tune.py
fi

PORT=${PORT:-5050}
echo "[*] Server ishga tushmoqda: http://127.0.0.1:$PORT"
echo "To'xtatish uchun: CTRL+C"
echo "=========================================================="

.venv/bin/python3 app.py
