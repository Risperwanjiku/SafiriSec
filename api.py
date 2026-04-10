from flask import Flask, jsonify
from flask_cors import CORS
import pandas as pd
import joblib
from sklearn.preprocessing import LabelEncoder
import random
from datetime import datetime, timedelta
import os

app = Flask(__name__)
CORS(app)  # Allow React dev server to fetch data from Flask

# ── File paths — works on both Windows and Linux ──────────────────────────────
BASE_DIR   = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, 'models', 'fraud_model.pkl')
DATA_PATH  = os.path.join(BASE_DIR, 'data', 'PS_20174392719_1491204439457_log.csv')

# ── Load model and data once at startup ──────────────────────────────────────
print("Loading model and data...")
print(f"Looking for model at: {MODEL_PATH}")
print(f"Looking for data at:  {DATA_PATH}")

model = joblib.load(MODEL_PATH)

df = pd.read_csv(DATA_PATH)
df = df[df['type'].isin(['CASH_OUT', 'TRANSFER'])].copy()
df['type_label'] = df['type'].copy()

le = LabelEncoder()
df['type'] = le.fit_transform(df['type'])

feats = ['step','type','amount','oldbalanceOrg','newbalanceOrig','oldbalanceDest','newbalanceDest']
df['predicted_fraud'] = model.predict(df[feats])

print("Model and data loaded successfully!")

# ── Compute all metrics once ──────────────────────────────────────────────────
total  = len(df)
pfraud = int(df['predicted_fraud'].sum())
afraud = int(df['isFraud'].sum())
caught = int(((df['predicted_fraud']==1)&(df['isFraud']==1)).sum())
fp     = int(((df['predicted_fraud']==1)&(df['isFraud']==0)).sum())
fn     = int(((df['predicted_fraud']==0)&(df['isFraud']==1)).sum())
tn     = int(((df['predicted_fraud']==0)&(df['isFraud']==0)).sum())
recall   = round(caught/afraud*100, 1)
prec     = round(caught/pfraud*100, 1)
accuracy = round((caught+tn)/total*100, 2)
f1       = round(2*prec*recall/(prec+recall), 1)

# ── API Routes ────────────────────────────────────────────────────────────────
@app.route('/api/metrics')
def metrics():
    return jsonify({
        "total": total,
        "fraudAlerts": pfraud,
        "recallRate": recall,
        "precisionRate": prec,
        "confirmedFraud": afraud
    })

@app.route('/api/confusion-matrix')
def confusion_matrix():
    return jsonify({
        "truePositive": caught,
        "falseNegative": fn,
        "falsePositive": fp,
        "trueNegative": tn,
        "recall": recall,
        "precision": prec,
        "accuracy": accuracy,
        "f1": f1
    })

@app.route('/api/charts')
def charts():
    fraud_by_type = df[df['predicted_fraud']==1]['type_label'].value_counts()
    fraud_type_data = [{"type": t, "count": int(c)} for t, c in fraud_by_type.items()]

    fdf = df[df['predicted_fraud']==1].copy()
    fdf['step_bin'] = pd.cut(fdf['step'], bins=6)
    sc = fdf['step_bin'].value_counts().sort_index()
    fraud_time_data = [
        {"time": f"{int(b.left)}-{int(b.right)}", "count": int(c)}
        for b, c in zip(sc.index, sc.values)
    ]

    bins_a = [0, 10000, 100000, 500000, 1000000, float('inf')]
    lbls_a = ['0-10K', '10K-100K', '100K-500K', '500K-1M', '1M+']
    fa = df[df['predicted_fraud']==1]['amount']
    ac = pd.cut(fa, bins=bins_a, labels=lbls_a).value_counts().sort_index()
    fraud_amount_data = [{"range": lbl, "count": int(c)} for lbl, c in zip(lbls_a, ac.values)]

    return jsonify({
        "fraudByType": fraud_type_data,
        "fraudByTime": fraud_time_data,
        "fraudByAmount": fraud_amount_data
    })

@app.route('/api/top10')
def top10():
    top = df[(df['predicted_fraud']==1)&(df['isFraud']==1)].nlargest(10,'amount').copy()
    random.seed(77)
    result = []
    for rank, (_, row) in enumerate(top.iterrows(), 1):
        risk = round(random.uniform(89, 99), 1)
        tid  = f"TXN-{abs(hash(str(row['amount'])+str(rank)))%10000000:07d}"
        result.append({
            "rank": rank,
            "id": tid,
            "amount": f"{row['amount']:,.0f}",
            "type": row['type_label'],
            "balance": f"{row['oldbalanceOrg']:,.0f}",
            "risk": risk
        })
    return jsonify(result)

@app.route('/api/flagged')
def flagged():
    fraud_rows = df[df['predicted_fraud']==1].head(20).copy()
    base_time  = datetime(2026, 4, 9, 14, 23, 41)
    random.seed(42)
    result = []

    for i, (_, row) in enumerate(fraud_rows.iterrows()):
        tid      = f"TXN-{abs(hash(str(row['amount'])+str(i)))%10000000:07d}"
        ts       = (base_time - timedelta(minutes=i*5, seconds=random.randint(0,59))).strftime("%Y-%m-%d %H:%M:%S")
        is_fraud = int(row['isFraud'])
        amt      = row['amount']
        dec      = random.randint(1, 9)

        if is_fraud == 1:
            risk   = random.randint(88, 99)
            status = "Confirmed Fraud"
        elif amt > 100000:
            risk   = random.randint(75, 87)
            status = "Under Review"
        else:
            risk   = random.randint(60, 74)
            status = "Cleared"

        result.append({
            "id": tid,
            "timestamp": ts,
            "amount": f"{amt:,.2f}",
            "type": row['type_label'],
            "balance": f"{row['oldbalanceOrg']:,.2f}",
            "risk": float(f"{risk}.{dec}"),
            "status": status
        })
    return jsonify(result)

@app.route('/api/download')
def download():
    fraud_rows = df[df['predicted_fraud']==1].head(50).copy()
    dl = fraud_rows[['type_label','amount','oldbalanceOrg','newbalanceOrig','isFraud']].copy()
    dl.columns = ['Type','Amount (KES)','Sender Before','Sender After','Confirmed Fraud']
    return dl.to_csv(index=False), 200, {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename=safirisec_flagged.csv'
    }

if __name__ == '__main__':
    print(f"\n🛡️  SafiriSec API running at: http://localhost:5000\n")
    app.run(debug=False, port=5000)