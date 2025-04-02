from flask import Flask, jsonify
from flask_cors import CORS
import pandas as pd
from datetime import datetime, timedelta
import requests
import threading
import time

app = Flask(__name__)
CORS(app)

BASE_URL = "http://10.1.19.105:5000/energygrid2?"
devices = ["D250AC01", "D250AC02", "D250AC03"]

# Global dictionary to store data
stored_data = {
    "energy": {},
    "temperature": {},
    "humidity": {},
    "monthly_avg": {}
}

def fetch_data(start_time, end_time):
    """Fetch energy data for a given time range."""
    url = f'{BASE_URL}where={{"$and":[{{"_created":{{"$gte":"{start_time}"}}}},{{"_created":{{"$lt":"{end_time}"}}}}]}}&max_results=500000'
    response = requests.get(url)

    if response.status_code == 200:
        res = response.json()
        df = pd.DataFrame.from_dict(pd.json_normalize(res['_items']), orient='columns')
        return df
    else:
        return None

def update_data():
    """Continuously update data in the background."""
    global stored_data

    while True:
        try:
            print("Fetching new data...")

            # Define time ranges
            t1 = (datetime.now() - timedelta(days=31)).strftime('%a, %d %b %Y %H:%M:%S GMT')
            t2 = (datetime.now() - timedelta(days=16)).strftime('%a, %d %b %Y %H:%M:%S GMT')
            t3 = datetime.now().strftime('%a, %d %b %Y %H:%M:%S GMT')

            # Fetch data in two batches
            df1 = fetch_data(t1, t2)
            df2 = fetch_data(t2, t3)

            if df1 is None or df2 is None:
                print("Failed to fetch data.")
                time.sleep(300)  # Wait before retrying
                continue

            # Concatenate both dataframes
            df = pd.concat([df1, df2], ignore_index=True)

            # Convert timestamp to date format
            df['Date'] = pd.to_datetime(df['Time_Stamp']).dt.date

            # Store new data
            new_energy_data = {}
            new_temperature_data = {}
            new_humidity_data = {}
            new_monthly_averages = {}

            for device in devices:
                df_device = df[df['Device_ID'] == device]

                # Compute daily average of unit_consumption
                daily_avg_energy = df_device.groupby('Date')['unit_consumption'].mean().reset_index()
                new_energy_data[device] = daily_avg_energy.rename(columns={'Date': 'day', 'unit_consumption': 'value'}).to_dict(orient='records')

                # Compute daily average of Temperature
                if 'Temperature' in df_device.columns:
                    daily_avg_temp = df_device.groupby('Date')['Temperature'].mean().reset_index()
                    new_temperature_data[device] = daily_avg_temp.rename(columns={'Date': 'day', 'Temperature': 'value'}).to_dict(orient='records')
                else:
                    new_temperature_data[device] = []

                # Compute daily average of Humidity
                if 'Humidity' in df_device.columns:
                    daily_avg_humidity = df_device.groupby('Date')['Humidity'].mean().reset_index()
                    new_humidity_data[device] = daily_avg_humidity.rename(columns={'Date': 'day', 'Humidity': 'value'}).to_dict(orient='records')
                else:
                    new_humidity_data[device] = []

                # Compute monthly averages
                avg_energy = df_device['unit_consumption'].mean()
                avg_temp = df_device['Temperature'].mean() if 'Temperature' in df_device.columns else None
                avg_humidity = df_device['Humidity'].mean() if 'Humidity' in df_device.columns else None

                new_monthly_averages[device] = {
                    "energy": round(avg_energy, 2),
                    "temperature": round(avg_temp, 2) if avg_temp else None,
                    "humidity": round(avg_humidity, 2) if avg_humidity else None
                }

            # Update stored data
            stored_data["energy"] = new_energy_data
            stored_data["temperature"] = new_temperature_data
            stored_data["humidity"] = new_humidity_data
            stored_data["monthly_avg"] = new_monthly_averages

            print("Data successfully updated.")
        except Exception as e:
            print(f"Error updating data: {e}")

        time.sleep(300)  # Wait 5 minutes before fetching again

# Start background thread
thread = threading.Thread(target=update_data, daemon=True)
thread.start()

@app.route('/energy-data', methods=['GET'])
def get_energy_data():
    return jsonify(stored_data)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=True)
