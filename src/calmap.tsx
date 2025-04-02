import React, { useEffect, useState } from "react";
import CalendarHeatMap from "react-d3-calendar-heatmap";
import "react-d3-calendar-heatmap/dist/react.d3.calendar.heatmap.css";

interface CalendarHeatMapItemType {
  day: string;
  value: number;
}

const getUnit = (type: string) => {
  switch (type) {
    case "energy":
      return " kWh";
    case "temperature":
      return " °C";
    case "humidity":
      return "%";
    default:
      return "";
  }
};

const getCurrentMonthRange = () => {
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return { from: firstDay, to: lastDay };
};


const CalMap = ({ deviceId, dataType, title }: { deviceId: string; dataType: string; title: string }) => {
  const [data, setData] = useState<CalendarHeatMapItemType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [monthlyAverage, setMonthlyAverage] = useState<number | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch("http://localhost:5001/energy-data");
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);

        const result = await response.json();
        const fetchedData = result[dataType][deviceId] || [];

        // Calculate monthly average
        const totalValue = fetchedData.reduce((sum: number, item: CalendarHeatMapItemType) => sum + item.value, 0);
        const avg = fetchedData.length > 0 ? totalValue / fetchedData.length : 0;
        setMonthlyAverage(avg);

        setData(fetchedData);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [deviceId, dataType]);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  // const timeRange = { from: new Date("2025-03-01"), to: new Date("2025-03-31") };
  const timeRange = getCurrentMonthRange();

  return (
    <div className="cal-container">
      <h3 className="cal-title">{title} {monthlyAverage ? monthlyAverage.toFixed(2) + getUnit(dataType): "N/A"}</h3>
      <CalendarHeatMap<CalendarHeatMapItemType>
        data={data}
        timeRange={timeRange}
        width={"450px"} 
        showWeekends={true}
        fillToWidth={false}
      />
    </div>
  );
};

export default CalMap;
