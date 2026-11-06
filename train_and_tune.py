"""
Titanic Survival Prediction - GridSearch Model Training and Evaluation
Trains and tunes 5 classification models using GridSearchCV, saves comparative metrics,
and persists both the best model and the dictionary of all tuned models for live switching.
"""

import json
import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import (
    GradientBoostingClassifier,
    RandomForestClassifier,
)
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)
from sklearn.model_selection import GridSearchCV, StratifiedKFold, train_test_split
from sklearn.neighbors import KNeighborsClassifier
from sklearn.pipeline import Pipeline
from sklearn.svm import SVC

from features import TitanicFeatureExtractor, build_preprocessor


def get_algorithms_and_param_grids():
    return {
        "Logistic Regression": {
            "model": LogisticRegression(max_iter=1000, random_state=42),
            "params": {
                "classifier__C": [0.01, 0.1, 1.0, 10.0],
                "classifier__solver": ["lbfgs", "liblinear"],
            },
        },
        "Support Vector Machine (SVC)": {
            "model": SVC(probability=True, random_state=42),
            "params": {
                "classifier__C": [0.1, 1.0, 5.0, 10.0],
                "classifier__kernel": ["rbf", "linear"],
                "classifier__gamma": ["scale", "auto"],
            },
        },
        "Random Forest": {
            "model": RandomForestClassifier(random_state=42),
            "params": {
                "classifier__n_estimators": [50, 100, 200],
                "classifier__max_depth": [4, 6, 8, 10],
                "classifier__min_samples_split": [2, 5, 10],
                "classifier__min_samples_leaf": [1, 2, 4],
            },
        },
        "Gradient Boosting": {
            "model": GradientBoostingClassifier(random_state=42),
            "params": {
                "classifier__n_estimators": [50, 100, 150],
                "classifier__learning_rate": [0.01, 0.05, 0.1],
                "classifier__max_depth": [3, 4, 5],
                "classifier__subsample": [0.8, 1.0],
            },
        },
        "K-Nearest Neighbors (KNN)": {
            "model": KNeighborsClassifier(),
            "params": {
                "classifier__n_neighbors": [3, 5, 7, 11, 15],
                "classifier__weights": ["uniform", "distance"],
                "classifier__metric": ["euclidean", "manhattan"],
            },
        },
    }


def main():
    print("Yuklanmoqda: Titanic-Dataset.csv ...")
    data_path = "/home/abbos/Pictures/quci task/Titanic-Dataset.csv"
    df = pd.read_csv(data_path)

    X = df.drop(columns=["Survived"])
    y = df["Survived"]

    # Stratified train-test split (80% train, 20% test)
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    models_config = get_algorithms_and_param_grids()

    results = []
    best_overall_score = -1.0
    best_overall_name = None
    best_overall_pipeline = None
    all_tuned_pipelines = {}

    print("\n--- GridSearchCV orqali algoritmlarni optimallashtirish va solishtirish boshlandi ---")

    for name, config in models_config.items():
        print(f"\nAlgoritm o'rganilmoqda: {name}...")
        pipeline = Pipeline(steps=[
            ("feature_extractor", TitanicFeatureExtractor()),
            ("preprocessor", build_preprocessor()),
            ("classifier", config["model"]),
        ])

        grid_search = GridSearchCV(
            estimator=pipeline,
            param_grid=config["params"],
            cv=cv,
            scoring="accuracy",
            n_jobs=-1,
            verbose=0,
        )

        grid_search.fit(X_train, y_train)

        best_pipeline = grid_search.best_estimator_
        cv_accuracy = float(grid_search.best_score_)

        # Test evaluation
        y_pred = best_pipeline.predict(X_test)
        y_prob = best_pipeline.predict_proba(X_test)[:, 1] if hasattr(best_pipeline, "predict_proba") else None

        test_acc = float(accuracy_score(y_test, y_pred))
        test_precision = float(precision_score(y_test, y_pred, zero_division=0))
        test_recall = float(recall_score(y_test, y_pred, zero_division=0))
        test_f1 = float(f1_score(y_test, y_pred, zero_division=0))
        test_roc_auc = float(roc_auc_score(y_test, y_prob)) if y_prob is not None else 0.0

        clean_params = {k.replace("classifier__", ""): v for k, v in grid_search.best_params_.items()}

        result_entry = {
            "algorithm": name,
            "best_cv_accuracy": round(cv_accuracy * 100, 2),
            "test_accuracy": round(test_acc * 100, 2),
            "test_precision": round(test_precision * 100, 2),
            "test_recall": round(test_recall * 100, 2),
            "test_f1": round(test_f1 * 100, 2),
            "test_roc_auc": round(test_roc_auc * 100, 2),
            "best_params": clean_params,
        }
        results.append(result_entry)

        # Fit on full data for production serving
        best_pipeline.fit(X, y)
        all_tuned_pipelines[name] = best_pipeline

        print(f" -> CV Aniqligi: {result_entry['best_cv_accuracy']}%")
        print(f" -> Test Aniqligi: {result_entry['test_accuracy']}% | F1: {result_entry['test_f1']}% | ROC-AUC: {result_entry['test_roc_auc']}%")

        # Best model criterion: combination of CV and Test accuracy/ROC
        overall_metric = (cv_accuracy + test_acc + test_roc_auc) / 3
        if overall_metric > best_overall_score:
            best_overall_score = overall_metric
            best_overall_name = name
            best_overall_pipeline = best_pipeline

    # Sort results by test_accuracy descending
    results.sort(key=lambda x: x["test_accuracy"], reverse=True)

    summary = {
        "best_algorithm": best_overall_name,
        "best_metric_score": round(best_overall_score * 100, 2),
        "dataset_info": {
            "total_samples": len(df),
            "train_samples": len(X_train),
            "test_samples": len(X_test),
            "survived_count": int(df["Survived"].sum()),
            "fatalities_count": int(len(df) - df["Survived"].sum()),
            "overall_survival_rate": round(float(df["Survived"].mean()) * 100, 2),
        },
        "models": results,
    }

    # Save summary JSON
    results_file = "/home/abbos/Pictures/quci task/models_comparison.json"
    with open(results_file, "w", encoding="utf-8") as f:
        json.dump(summary, f, indent=4, ensure_ascii=False)
    print(f"\nBarcha modellar hisoboti saqlandi: {results_file}")

    # Save best model pipeline
    best_model_file = "/home/abbos/Pictures/quci task/best_titanic_model.joblib"
    joblib.dump(best_overall_pipeline, best_model_file)
    print(f"Eng zo'r model saqlandi: {best_model_file}")

    # Save all tuned models pipeline dictionary for interactive model switching
    all_models_file = "/home/abbos/Pictures/quci task/all_titanic_models.joblib"
    joblib.dump(all_tuned_pipelines, all_models_file)
    print(f"Barcha 5 ta optimallashtirilgan model saqlandi: {all_models_file}")


if __name__ == "__main__":
    main()
