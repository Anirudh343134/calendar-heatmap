import React, { useEffect, useState } from "react";
import CalendarHeatMap from "react-d3-calendar-heatmap";
import "react-d3-calendar-heatmap/dist/react.d3.calendar.heatmap.css";
import { scaleSequential } from "d3-scale";
import { interpolateRdYlGn } from "d3-scale-chromatic";

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
  const [dataMin, setDataMin] = useState<number>(0);
  const [dataMax, setDataMax] = useState<number>(0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
  
        const response = await fetch("http://10.1.19.25:5000/energy-data");
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
  
        const result = await response.json();
        const fetchedData = result[dataType][deviceId] || [];
  
        // Calculate monthly average
        const totalValue = fetchedData.reduce((sum: number, item: CalendarHeatMapItemType) => sum + item.value, 0);
        const avg = fetchedData.length > 0 ? totalValue / fetchedData.length : 0;
        setMonthlyAverage(avg);
        
        // Find min and max for display purposes
        if (fetchedData.length > 0) {
          const values = fetchedData.map((item: CalendarHeatMapItemType) => item.value);
          setDataMin(Math.min(...values));
          setDataMax(Math.max(...values));
        }
  
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

  // Create the color scale - using RdYlGn which gives green for high values
  // We reverse the domain to make green represent higher values
  const colorScale = scaleSequential(interpolateRdYlGn).domain([dataMin, dataMax]);

  const timeRange = getCurrentMonthRange();

  return (
    <div className="cal-container">
      <h3 className="cal-title">
        {title} {monthlyAverage ? monthlyAverage.toFixed(2) + getUnit(dataType) : "N/A"}

      </h3>
      <CalendarHeatMap<CalendarHeatMapItemType>
        data={data}
        timeRange={timeRange}
        width="450px"
        weekday="weekend"
        fillToWidth={false}
        customD3ColorScale={colorScale}
        defaultColor="#f0f0f0"
      />
    </div>
  );
};

export default CalMap;
