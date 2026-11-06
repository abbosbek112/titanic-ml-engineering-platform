"""
Titanic Feature Engineering and Preprocessing Module
Extracts domain-specific features and provides transformers for Titanic datasets.
"""

import re
from typing import Any
import numpy as np
import pandas as pd
from sklearn.base import BaseEstimator, TransformerMixin
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler


class TitanicFeatureExtractor(BaseEstimator, TransformerMixin):
    """
    Custom transformer for domain-specific feature engineering on Titanic dataset.
    Extracts Title from Name, Deck from Cabin, computes FamilySize and IsAlone,
    imputes missing values conditionally, and calculates LogFare.
    """

    def __init__(self):
        self.age_medians_ = {}
        self.fare_median_ = 32.2
        self.embarked_mode_ = "S"

    def fit(self, X: pd.DataFrame, y=None):
        df = X.copy()
        # Compute title
        titles = df["Name"].apply(self._extract_title) if "Name" in df.columns else pd.Series(["Mr"] * len(df))
        df["Title"] = titles

        # Median age per Title and Pclass
        if "Age" in df.columns and "Pclass" in df.columns:
            grouped = df.groupby(["Title", "Pclass"])["Age"].median()
            self.age_medians_ = grouped.to_dict()

        if "Fare" in df.columns:
            self.fare_median_ = float(df["Fare"].median() if not df["Fare"].isna().all() else 32.2)

        if "Embarked" in df.columns:
            mode_val = df["Embarked"].mode()
            self.embarked_mode_ = mode_val[0] if len(mode_val) > 0 else "S"

        return self

    @staticmethod
    def _extract_title(name: str) -> str:
        if not isinstance(name, str):
            return "Mr"
        match = re.search(r" ([A-Za-z]+)\.", name)
        if match:
            title = match.group(1)
            if title in ["Mlle", "Ms"]:
                return "Miss"
            elif title == "Mme":
                return "Mrs"
            elif title in ["Mr", "Mrs", "Miss", "Master"]:
                return title
            else:
                return "Rare"
        return "Mr"

    @staticmethod
    def _extract_deck(cabin: Any) -> str:
        if isinstance(cabin, str) and cabin.strip():
            return cabin.strip()[0].upper()
        return "Unknown"

    def transform(self, X: pd.DataFrame) -> pd.DataFrame:
        df = X.copy()

        # Title
        if "Name" in df.columns:
            df["Title"] = df["Name"].apply(self._extract_title)
        else:
            df["Title"] = "Mr"

        # Embarked imputation
        if "Embarked" in df.columns:
            df["Embarked"] = df["Embarked"].fillna(self.embarked_mode_)
        else:
            df["Embarked"] = self.embarked_mode_

        # Fare imputation
        if "Fare" in df.columns:
            df["Fare"] = df["Fare"].fillna(self.fare_median_)
        else:
            df["Fare"] = self.fare_median_

        # Age imputation based on Title and Pclass
        if "Age" in df.columns:
            def fill_age(row):
                if pd.isna(row["Age"]):
                    key = (row.get("Title", "Mr"), row.get("Pclass", 3))
                    return self.age_medians_.get(key, 28.0)
                return row["Age"]
            df["Age"] = df.apply(fill_age, axis=1)
        else:
            df["Age"] = 28.0

        # Family size and IsAlone
        sibsp = df["SibSp"] if "SibSp" in df.columns else 0
        parch = df["Parch"] if "Parch" in df.columns else 0
        df["FamilySize"] = sibsp + parch + 1
        df["IsAlone"] = (df["FamilySize"] == 1).astype(int)

        # Deck
        if "Cabin" in df.columns:
            df["Deck"] = df["Cabin"].apply(self._extract_deck)
        else:
            df["Deck"] = "Unknown"

        # Fare log transform
        df["LogFare"] = np.log1p(np.maximum(df["Fare"], 0.0))

        # Select relevant feature columns
        selected_features = [
            "Pclass",
            "Sex",
            "Age",
            "SibSp",
            "Parch",
            "Fare",
            "LogFare",
            "Embarked",
            "Title",
            "FamilySize",
            "IsAlone",
            "Deck",
        ]
        return df[selected_features]


def build_preprocessor() -> ColumnTransformer:
    numeric_features = ["Age", "SibSp", "Parch", "Fare", "LogFare", "FamilySize", "IsAlone"]
    categorical_features = ["Pclass", "Sex", "Embarked", "Title", "Deck"]

    numeric_transformer = Pipeline(steps=[
        ("scaler", StandardScaler()),
    ])

    categorical_transformer = Pipeline(steps=[
        ("onehot", OneHotEncoder(handle_unknown="ignore", sparse_output=False)),
    ])

    return ColumnTransformer(
        transformers=[
            ("num", numeric_transformer, numeric_features),
            ("cat", categorical_transformer, categorical_features),
        ],
        remainder="drop"
    )
