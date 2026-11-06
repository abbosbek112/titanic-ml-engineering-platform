"""
Titanic Survival Predictor - Advanced Flask Web Application
Provides interactive prediction endpoints with multi-model switching,
what-if counterfactual analysis, historical passenger matching,
and 1912 Marconi telegram & evacuation timeline generation.
"""

import json
import os
import random
from typing import Dict, Any, List, Optional
import joblib
import numpy as np
import pandas as pd
from flask import Flask, jsonify, render_template, request

# Import feature extractor so joblib can unpickle cleanly
from features import TitanicFeatureExtractor, build_preprocessor

app = Flask(__name__)
app.config["TEMPLATES_AUTO_RELOAD"] = True

# Base paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
BEST_MODEL_PATH = os.path.join(BASE_DIR, "best_titanic_model.joblib")
ALL_MODELS_PATH = os.path.join(BASE_DIR, "all_titanic_models.joblib")
COMPARISON_PATH = os.path.join(BASE_DIR, "models_comparison.json")
DATASET_PATH = os.path.join(BASE_DIR, "Titanic-Dataset.csv")

# Load models
if os.path.exists(ALL_MODELS_PATH):
    all_models: Dict[str, Any] = joblib.load(ALL_MODELS_PATH)
elif os.path.exists(BEST_MODEL_PATH):
    single_model = joblib.load(BEST_MODEL_PATH)
    all_models = {"Logistic Regression": single_model}
else:
    all_models = {}

best_model = None
if os.path.exists(BEST_MODEL_PATH):
    best_model = joblib.load(BEST_MODEL_PATH)
elif "Logistic Regression" in all_models:
    best_model = all_models["Logistic Regression"]
elif all_models:
    best_model = next(iter(all_models.values()))

# Load models comparison report
if os.path.exists(COMPARISON_PATH):
    with open(COMPARISON_PATH, "r", encoding="utf-8") as f:
        models_comparison = json.load(f)
else:
    models_comparison = {"models": [], "best_algorithm": "Logistic Regression"}

# Load raw Titanic dataset for historical twin matching
if os.path.exists(DATASET_PATH):
    titanic_raw_df = pd.read_csv(DATASET_PATH)
else:
    titanic_raw_df = pd.DataFrame()


def match_historical_passenger(
    pclass: int,
    sex: str,
    age: float,
    sibsp: int,
    parch: int,
    embarked: str
) -> Dict[str, Any]:
    """
    Finds the closest real historical Titanic passenger from the dataset
    using a weighted similarity metric (exact on sex/class when possible).
    """
    if titanic_raw_df.empty:
        return {}

    candidates = titanic_raw_df.copy()
    
    # Priority subset on sex & pclass
    subset = candidates[(candidates["Sex"] == sex) & (candidates["Pclass"] == pclass)]
    if subset.empty:
        subset = candidates[candidates["Sex"] == sex]
    if subset.empty:
        subset = candidates

    # Impute missing age with median for distance computation
    ages = subset["Age"].fillna(28.0)
    sib = subset["SibSp"].fillna(0)
    par = subset["Parch"].fillna(0)
    
    # Distance formula: Age (0.5) + Family (1.0) + Embarked bonus
    emb_penalty = (subset["Embarked"].fillna("S") != embarked).astype(float) * 2.0
    distances = (
        0.5 * (np.abs(ages - age) / 10.0) +
        1.0 * (np.abs(sib - sibsp) + np.abs(par - parch)) +
        emb_penalty
    )

    best_idx = distances.idxmin()
    matched = candidates.loc[best_idx]

    survived_bool = bool(matched["Survived"] == 1)
    deck = str(matched["Cabin"])[0] if pd.notna(matched["Cabin"]) and str(matched["Cabin"]).strip() else "Belgilanmagan"

    return {
        "name": str(matched["Name"]),
        "actual_survived": survived_bool,
        "age": int(matched["Age"]) if pd.notna(matched["Age"]) else 28,
        "pclass": int(matched["Pclass"]),
        "ticket": str(matched["Ticket"]),
        "fare": round(float(matched["Fare"]), 2) if pd.notna(matched["Fare"]) else 0.0,
        "cabin": str(matched["Cabin"]) if pd.notna(matched["Cabin"]) else "Noma'lum",
        "deck": deck,
        "embarked": str(matched["Embarked"]) if pd.notna(matched["Embarked"]) else "S",
        "fate_description": (
            "1912-yil 15-aprelda RMS Carpathia kemasi tomonidan qutqarilgan!"
            if survived_bool else
            "Afsuski, 1912-yil 15-aprel kechasi Atlantika okeanida halok bo'lgan."
        )
    }


def calculate_what_if_scenarios(
    base_payload: Dict[str, Any],
    active_pipeline: Any,
    current_prob: float
) -> List[Dict[str, Any]]:
    """
    Computes alternative 'What-If' scenarios and quantifies the exact survival delta.
    """
    scenarios = []

    def eval_scenario(override: Dict[str, Any], label: str, icon: str) -> Optional[Dict[str, Any]]:
        test_data = dict(base_payload)
        test_data.update(override)
        df_row = pd.DataFrame([{
            "Pclass": test_data["pclass"],
            "Name": f"{test_data['name']}, {test_data.get('title', 'Mr')}.",
            "Sex": test_data["sex"],
            "Age": test_data["age"],
            "SibSp": test_data["sibsp"],
            "Parch": test_data["parch"],
            "Ticket": "WSL-99999",
            "Fare": test_data["fare"],
            "Cabin": test_data.get("cabin", ""),
            "Embarked": test_data["embarked"],
        }])
        prob = float(active_pipeline.predict_proba(df_row)[0][1])
        prob_pct = round(prob * 100, 1)
        cur_pct = round(current_prob * 100, 1)
        diff = round(prob_pct - cur_pct, 1)
        diff_str = f"+{diff}%" if diff > 0 else f"{diff}%"

        return {
            "title": label,
            "icon": icon,
            "new_probability": prob_pct,
            "diff": diff,
            "diff_text": diff_str,
            "status": "better" if diff > 0 else ("worse" if diff < 0 else "same")
        }

    # 1. Pclass variations
    if base_payload["pclass"] != 1:
        scenarios.append(eval_scenario(
            {"pclass": 1, "fare": 85.0, "cabin": "C"},
            "Agar 1-Klass (Lyuks)da sayohat qilganingizda",
            "fa-crown"
        ))
    if base_payload["pclass"] != 3:
        scenarios.append(eval_scenario(
            {"pclass": 3, "fare": 12.0, "cabin": ""},
            "Agar 3-Klass (Quyi Paluba)da bo'lganingizda",
            "fa-users-line"
        ))

    # 2. Gender variation
    opposite_sex = "female" if base_payload["sex"] == "male" else "male"
    opposite_title = "Mrs" if opposite_sex == "female" else "Mr"
    sex_label = "Agar Ayol bo'lganingizda" if opposite_sex == "female" else "Agar Erkak bo'lganingizda"
    scenarios.append(eval_scenario(
        {"sex": opposite_sex, "title": opposite_title},
        sex_label,
        "fa-venus-mars"
    ))

    # 3. Solo vs Family variation
    if (base_payload["sibsp"] + base_payload["parch"]) > 0:
        scenarios.append(eval_scenario(
            {"sibsp": 0, "parch": 0},
            "Agar yolg'iz (hamrohlarsiz) bo'lganingizda",
            "fa-person"
        ))
    else:
        scenarios.append(eval_scenario(
            {"sibsp": 1, "parch": 2},
            "Agar oilaviy (3 ta hamroh bilan) bo'lganingizda",
            "fa-people-group"
        ))

    # 4. Port variation (Cherbourg had historically higher survival rate)
    if base_payload["embarked"] != "C":
        scenarios.append(eval_scenario(
            {"embarked": "C"},
            "Agar Cherbourg (Fransiya) portidan chiqqaningizda",
            "fa-anchor"
        ))

    return [s for s in scenarios if s is not None]


def generate_survival_timeline(pclass: int, sex: str, prob: float) -> List[Dict[str, str]]:
    """Generates a realistic 4-step evacuation timeline tailored to the passenger profile."""
    survived = prob >= 0.5
    timeline = []

    # 23:40
    if pclass == 1:
        t1 = "Lyuks oromgohingizda krovatingiz yengil tebranganini sezasiz. Styuard aysberg bilan yengil to'qnashuv bo'lganini aytadi."
    elif pclass == 2:
        t1 = "Ikkinchi klass zalida qattiq qirsillagan tovush va tebranish eshitiladi, ko'pchilik palubaga qarab yo'l oladi."
    else:
        t1 = "Kemaning quyi qavatida kuchli gursillash va suv oqimi sadosi eshitiladi. Koridorlarda sarosima boshlanadi."
    timeline.append({
        "time": "23:40",
        "title": "Aysberg bilan to'qnashuv",
        "desc": t1,
        "icon": "fa-snowflake"
    })

    # 00:20
    if pclass == 1:
        t2 = "Kapitan Smitning shaxsiy ogohlantirishi: Styuardlar sizga qutqaruv nimchasini kiyishni va yuqori palubaga chiqishni iltimos qiladi."
    elif pclass == 2:
        t2 = "Qutqaruv nimchalari tarqatila boshlaydi, oilalarga zudlik bilan qayiq palubasiga chiqish buyuriladi."
    else:
        t2 = "Quyi palubadagi panjarali to'siqlar oldida to'planish. Ko'plab yo'laklar suv ostida qolmoqda, yuqoriga chiqish mushkul."
    timeline.append({
        "time": "00:20",
        "title": "Ogohlantirish va Nimchalar",
        "desc": t2,
        "icon": "fa-life-ring"
    })

    # 01:15
    if sex == "female":
        t3 = "'Ayollar va bolalar avval!' qoidasi bo'yicha sizni birinchilardan bo'lib qutqaruv qayig'iga chiqarishadi."
    elif pclass == 1 and sex == "male":
        t3 = "Yuqori palubadasiz, ofitserlar bo'sh qolgan qutqaruv qayiqlariga erkaklarni navbati bilan chiqarishmoqda."
    else:
        t3 = "Zobitlar erkaklarni orqaga surib, faqat ayollarni qutqarishmoqda. Qutqaruv qayiqlari soni keskin kamayib bormoqda."
    timeline.append({
        "time": "01:15",
        "title": "Qayiqlarni suvga tushirish",
        "desc": t3,
        "icon": "fa-sailboat"
    })

    # 02:20
    if survived:
        t4 = "Kema ikkiga bo'linib suv ostiga ketmoqda. Siz qutqaruv qayig'idasiz va uzoqdan 'RMS Carpathia' kemasining chiroqlari ko'rinmoqda!"
    else:
        t4 = "So'nggi qutqaruv qayig'i ham ketib bo'ldi. -2°C muzdek Atlantika okeani suvlarida omon qolishning iloji qolmadi."
    timeline.append({
        "time": "02:20",
        "title": "Titanicning cho'kishi",
        "desc": t4,
        "icon": "fa-water"
    })

    return timeline


def generate_marconi_telegram(name: str, prob: float, pclass: int, sex: str) -> Dict[str, str]:
    """Generates an authentic Marconi Wireless Telegraph dispatch from April 1912."""
    survived = prob >= 0.5
    date_str = "15 APRIL 1912 - 04:30 GMT"
    call_sign = "M.G.Y. (RMS TITANIC) / M.P.A. (RMS CARPATHIA)"
    
    if survived:
        msg = f"AM SAFE ABOARD STEAMER CARPATHIA. {name.upper()} RESCUED FROM LIFEBOAT. PROCEEDING TO NEW YORK."
        status_label = "RESCUED // TIRIK QOLDI"
        status_code = "SOS-SAFE"
    else:
        msg = f"TITANIC SANK 02:20 AM. REGRET PASSENGER {name.upper()} UNACCOUNTED FOR AMONG CARPATHIA SURVIVORS."
        status_label = "MISSING AT SEA // G'ARQ BO'LDI"
        status_code = "SOS-LOST"

    return {
        "call_sign": call_sign,
        "date": date_str,
        "coordinates": "41°46'N, 50°14'W",
        "message": msg,
        "status_label": status_label,
        "status_code": status_code,
    }


def analyze_factors(
    pclass: int,
    sex: str,
    age: float,
    family_size: int,
    fare: float,
    prob: float
) -> List[Dict[str, Any]]:
    """Calculates domain factor impact explanations."""
    factors = []
    if sex == "female":
        factors.append({
            "name": "Jins (Ayol)",
            "impact": "positive",
            "score": "+45%",
            "desc": "1912-yilda 'Ayollar va bolalar avval' qoidasiga qat'iy amal qilingan. Ayollarning 74% dan ortig'i qutqarilgan."
        })
    else:
        factors.append({
            "name": "Jins (Erkak)",
            "impact": "negative",
            "score": "-40%",
            "desc": "Erkaklarga faqat bo'sh joy qolgandagina ruxsat berilgan. Ularning bor-yo'g'i ~19% qismi tirik qolgan."
        })

    if pclass == 1:
        factors.append({
            "name": "Klass (1-toifa lyuks)",
            "impact": "positive",
            "score": "+30%",
            "desc": "1-klass kayutalari yuqori qayiq palubasiga eng yaqin joylashgan bo'lib, ular birinchilardan ogohlantirilgan."
        })
    elif pclass == 2:
        factors.append({
            "name": "Klass (2-toifa o'rta)",
            "impact": "neutral",
            "score": "+5%",
            "desc": "2-klass yo'lovchilari uchun o'rta sharoit yaratilgan, biroq erkaklar uchun imkoniyat baribir past bo'lgan."
        })
    else:
        factors.append({
            "name": "Klass (3-toifa quyi paluba)",
            "impact": "negative",
            "score": "-25%",
            "desc": "Kemaning eng quyi bo'limlaridagi labirint yo'laklar va yopiq panjaralar tufayli ko'pchilik chiqishga ulgurmagan."
        })

    if age < 12:
        factors.append({
            "name": f"Yosh ({int(age)} yosh - Go'dak/Bola)",
            "impact": "positive",
            "score": "+20%",
            "desc": "Kichik yoshdagi bolalar qutqaruv qayiqlari uchun eng ustuvor hisoblangan."
        })
    elif age > 60:
        factors.append({
            "name": f"Yosh ({int(age)} yosh - Katta yosh)",
            "impact": "negative",
            "score": "-10%",
            "desc": "Sovuq suv va vahima sharoitida evakuatsiya qilish katta yoshdagilar uchun juda og'ir kechgan."
        })

    if family_size == 1:
        factors.append({
            "name": "Yolg'iz sayohatchi",
            "impact": "positive" if pclass <= 2 else "neutral",
            "score": "+5%",
            "desc": "Oila a'zolarini qidirishga vaqt sarflamagan, tezkor qaror qabul qilish imkoni bo'lgan."
        })
    elif family_size > 4:
        factors.append({
            "name": f"Katta oila ({family_size} kishi)",
            "impact": "negative",
            "score": "-15%",
            "desc": "Barcha oila a'zolarini bir joyga to'plash va birga qutqarilish imkoni juda past bo'lgan."
        })

    return factors


def get_verdict_narrative(prob: float, name: str, pclass: int, sex: str) -> Dict[str, Any]:
    pct = round(prob * 100, 1)
    if prob >= 0.75:
        title = "Tirik qoldingiz! Mo''jizaviy najot!"
        status = "survived"
        lifeboat_num = random.choice([3, 5, 7, 8, 9, 11])
        story = (
            f"1912-yil 15-aprel soat 02:20 da kema cho'kayotgan paytda, siz {lifeboat_num}-raqamli "
            f"qutqaruv qayig'iga joylashishga muvaffaq bo'ldingiz! Ertalab soat 06:00 da 'RMS Carpathia' "
            f"kemasi sizni muzdek Atlantika suvidan qutqarib oldi."
        )
    elif prob >= 0.50:
        title = "Tirik qolish imkoniyati yuqori!"
        status = "likely_survived"
        lifeboat_num = random.choice([12, 13, 14, 15, 16])
        story = (
            f"Og'ir sarosima va sovuqqa qaramay, siz so'nggi daqiqalarda {lifeboat_num}-raqamli qayiqqa "
            f"chiqishga ulgurasiz. Ko'plab yo'qotishlar ichida siz omon qolgan 710 nafar baxtli insonlar qatoridasiz."
        )
    elif prob >= 0.30:
        title = "O'ta xavfli taqdir! Omon qolish qiyin!"
        status = "peril"
        story = (
            f"Imkoniyatingiz 50% dan past. Faqat favqulodda omad yoki suvga sakrab muz bo'laklariga "
            f"yopishish orqaligina omon qolish mumkin edi. Ko'pchilik -2°C darajali suvda 15 daqiqa ichida halok bo'lgan."
        )
    else:
        title = "Afsuski, g'arq bo'lish xavfi juda yuqori!"
        status = "fatal"
        story = (
            f"1912-yilning o'sha mash'um kechasida sovuq Shimoliy Atlantika suvlari sizni o'z domiga tortardi. "
            f"Sizning toifangizdagi yo'lovchilarning 80% dan ortig'i qutqaruv qayiqlari yetishmasligi oqibatida kema bilan birga cho'kkan."
        )

    return {
        "title": title,
        "status": status,
        "story": story,
        "probability_percent": pct,
    }


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/models-info", methods=["GET"])
def get_models_info():
    """Return GridSearchCV comparison results, dataset statistics, and available models list."""
    available_model_names = [
        "GridSearchCV (Eng Yaxshi Model)",
        "Logistic Regression",
        "Support Vector Machine (SVC)",
        "Random Forest",
        "Gradient Boosting",
        "K-Nearest Neighbors (KNN)"
    ]
    return jsonify({
        "status": "success",
        "data": models_comparison,
        "available_models": available_model_names,
    })


@app.route("/api/predict", methods=["POST"])
def predict_survival():
    """Predict Titanic survival probability with multi-model inference, what-if scenarios, and historical matching."""
    try:
        data = request.get_json(force=True)
        if not data:
            return jsonify({"status": "error", "message": "Ma'lumotlar kiritilmadi"}), 400

        name = str(data.get("name", "Hurmatli Yo'lovchi")).strip()
        title_prefix = str(data.get("title", "Mr")).strip()
        sex = str(data.get("sex", "male")).strip().lower()
        if sex not in ["male", "female"]:
            sex = "male"

        try:
            pclass = int(data.get("pclass", 3))
            pclass = max(1, min(3, pclass))
        except (ValueError, TypeError):
            pclass = 3

        try:
            age = float(data.get("age", 28.0))
            age = max(0.5, min(100.0, age))
        except (ValueError, TypeError):
            age = 28.0

        try:
            sibsp = int(data.get("sibsp", 0))
            sibsp = max(0, min(10, sibsp))
        except (ValueError, TypeError):
            sibsp = 0

        try:
            parch = int(data.get("parch", 0))
            parch = max(0, min(10, parch))
        except (ValueError, TypeError):
            parch = 0

        embarked = str(data.get("embarked", "S")).strip().upper()
        if embarked not in ["S", "C", "Q"]:
            embarked = "S"

        cabin = str(data.get("cabin", "")).strip().upper()
        cabin_code = cabin if (cabin and cabin not in ["NONE", "UNKNOWN"]) else ""

        # Default fares
        default_fares = {1: 84.15, 2: 20.66, 3: 13.68}
        fare_val = data.get("fare")
        if fare_val is not None and str(fare_val).strip() != "":
            try:
                fare = float(fare_val)
            except (ValueError, TypeError):
                fare = default_fares.get(pclass, 13.68)
        else:
            fare = default_fares.get(pclass, 13.68)

        # Selected model (supports "GridSearchCV (Eng Yaxshi Model)", "GridSearchCV", "great search", etc.)
        raw_model_choice = str(data.get("model", "GridSearchCV (Eng Yaxshi Model)")).strip()
        is_gridsearch = any(k in raw_model_choice.lower() for k in ["grid", "great", "optimal", "best", "yaxshi"])

        if is_gridsearch or raw_model_choice == "GridSearchCV (Eng Yaxshi Model)":
            active_pipeline = best_model or all_models.get("Logistic Regression") or next(iter(all_models.values()))
            chosen_model_name = "GridSearchCV (Eng Yaxshi Model: Logistic Regression)"
        else:
            active_pipeline = all_models.get(raw_model_choice)
            if active_pipeline is None:
                active_pipeline = best_model or next(iter(all_models.values()))
                chosen_model_name = "GridSearchCV (Eng Yaxshi Model: Logistic Regression)"
            else:
                chosen_model_name = raw_model_choice

        full_name = f"{name}, {title_prefix}."

        input_df = pd.DataFrame([{
            "Pclass": pclass,
            "Name": full_name,
            "Sex": sex,
            "Age": age,
            "SibSp": sibsp,
            "Parch": parch,
            "Ticket": "WSL-" + str(random.randint(10000, 99999)),
            "Fare": fare,
            "Cabin": cabin_code,
            "Embarked": embarked,
        }])

        # Active model prediction
        prob_array = active_pipeline.predict_proba(input_df)[0]
        survival_prob = float(prob_array[1])
        prediction = int(survival_prob >= 0.5)

        # Multi-model votes comparison (All 5 tuned algorithms)
        model_votes = {}
        for m_name, m_pipe in all_models.items():
            if m_name.startswith("GridSearch"):
                continue
            try:
                m_prob = float(m_pipe.predict_proba(input_df)[0][1])
                model_votes[m_name] = {
                    "survival_probability": round(m_prob * 100, 1),
                    "vote": "Omon qoladi" if m_prob >= 0.5 else "G'arq bo'ladi"
                }
            except Exception:
                pass

        family_size = sibsp + parch + 1
        factors = analyze_factors(pclass, sex, age, family_size, fare, survival_prob)
        verdict = get_verdict_narrative(survival_prob, name, pclass, sex)

        # XAI Balance weights (Taqdir Tarozisi)
        pos_weight = 0
        neg_weight = 0
        for f in factors:
            score_num = abs(int(str(f["score"]).replace("%", "").replace("+", "").replace("-", "")))
            if f["impact"] == "positive":
                pos_weight += score_num
            elif f["impact"] == "negative":
                neg_weight += score_num

        # Tilt angle: negative means right pan sinks (hazard heavy), positive means left pan sinks (rescue heavy)
        diff = pos_weight - neg_weight
        tilt_deg = max(-20.0, min(20.0, diff * 0.45))
        xai_balance = {
            "positive_score": pos_weight,
            "negative_score": neg_weight,
            "tilt_angle": round(tilt_deg, 1),
            "dominant_side": "positive" if pos_weight >= neg_weight else "negative",
            "tag_text": f"Najot omillari og'irroq (+{pos_weight}%)" if pos_weight >= neg_weight else f"Xavf omillari og'irroq (-{neg_weight}%)"
        }

        # 1912 Historical Occupation & Birth Year estimation
        birth_year = 1912 - int(age)
        if age < 14:
            calling = "Scholar / Young Traveller" if pclass <= 2 else "Emigrant Child"
        elif sex == "female":
            calling = "Lady of Leisure / Aristocrat" if pclass == 1 else ("Governess / Typist" if pclass == 2 else "Domestic Seamstress")
        else:
            calling = "Gentleman of Independent Means" if pclass == 1 else ("Merchant / Commercial Clerk" if pclass == 2 else "Industrial Labourer / Tradesman")

        # Advanced Logic Enhancements
        base_payload = {
            "name": name,
            "title": title_prefix,
            "sex": sex,
            "pclass": pclass,
            "age": age,
            "sibsp": sibsp,
            "parch": parch,
            "embarked": embarked,
            "cabin": cabin_code,
            "fare": fare,
        }
        what_if_scenarios = calculate_what_if_scenarios(base_payload, active_pipeline, survival_prob)
        historical_twin = match_historical_passenger(pclass, sex, age, sibsp, parch, embarked)
        timeline = generate_survival_timeline(pclass, sex, survival_prob)
        telegram = generate_marconi_telegram(name, survival_prob, pclass, sex)

        port_names = {
            "S": "Southampton (Buyuk Britaniya)",
            "C": "Cherbourg (Fransiya)",
            "Q": "Queenstown (Irlandiya)",
        }

        response_payload = {
            "status": "success",
            "prediction": prediction,
            "survival_probability": round(survival_prob * 100, 1),
            "fatality_probability": round((1.0 - survival_prob) * 100, 1),
            "verdict": verdict,
            "factors": factors,
            "xai_balance": xai_balance,
            "model_used": chosen_model_name,
            "gridsearch_info": {
                "title": "GridSearchCV Optimal Modeli",
                "best_model": "Logistic Regression",
                "accuracy": 84.92,
                "roc_auc": 86.56,
                "cv_strategy": "5-Fold Stratified K-Fold",
                "best_params": {"C": 1.0, "solver": "lbfgs"},
                "explanation": "GridSearchCV orqali 5 xil klassifikatsiya modeli va 40+ giperparametr kombinatsiyalari o'rganilib, eng yuqori umumlashtirish aniqligi (84.92%) bilan Logistic Regression g'olib bo'lgan."
            },
            "model_votes": model_votes,
            "what_if_scenarios": what_if_scenarios,
            "historical_twin": historical_twin,
            "timeline": timeline,
            "telegram": telegram,
            "passenger_summary": {
                "name": name,
                "title": title_prefix,
                "pclass": pclass,
                "sex": "Erkak" if sex == "male" else "Ayol",
                "age": age,
                "birth_year": birth_year,
                "occupation": calling,
                "family_size": family_size,
                "fare": round(fare, 2),
                "embarked_port": port_names.get(embarked, "Southampton"),
                "ticket_no": input_df.iloc[0]["Ticket"],
                "cabin": cabin_code if cabin_code else "Belgilanmagan (Deck E/F)",
            },
        }

        return jsonify(response_payload)

    except Exception as exc:
        return jsonify({
            "status": "error",
            "message": f"Kutilmagan xatolik yuz berdi: {str(exc)}"
        }), 500


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5050))
    print(f"Titanic veb-ilovasi ishga tushmoqda: http://127.0.0.1:{port}")
    app.run(host="0.0.0.0", port=port, debug=False)
