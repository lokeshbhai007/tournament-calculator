
import { useState } from "react";

export default function Step3CombineResultComponent() {
  const [csv1, setCsv1] = useState("");
  const [csv2, setCsv2] = useState("");
  const [mergedCsv, setMergedCsv] = useState("");

  // Parse CSV to array of objects
  function parseCsv(csv) {
    const lines = csv.trim().split(/\r?\n/);
    const headers = lines[0].split(",");
    return lines.slice(1).map(line => {
      const values = line.split(",");
      const obj = {};
      headers.forEach((h, i) => obj[h.trim()] = values[i]?.trim() || "");
      return obj;
    });
  }

  // Merge points for matching team names
  function mergeCsvs() {
    if (!csv1 || !csv2) return alert("Upload both CSV files");
    const arr1 = parseCsv(csv1);
    const arr2 = parseCsv(csv2);
    if (!arr1.length || !arr2.length) return alert("Both CSVs must have data");
    const headers = Object.keys(arr1[0]);
    // Find the placement points column (case-insensitive)
    const pointsCol = headers.find(h => h.toLowerCase().includes("placement"));
    const teamCol = headers.find(h => h.toLowerCase().includes("team"));
    if (!pointsCol || !teamCol) return alert("CSV must have 'Team' and 'Placement Points' columns");
    // Build a map from team name to points for both CSVs
    const pointsMap = {};
    arr1.forEach(row => {
      pointsMap[row[teamCol]] = Number(row[pointsCol]) || 0;
    });
    arr2.forEach(row => {
      if (pointsMap[row[teamCol]] !== undefined) {
        pointsMap[row[teamCol]] += Number(row[pointsCol]) || 0;
      } else {
        pointsMap[row[teamCol]] = Number(row[pointsCol]) || 0;
      }
    });
    // Build merged array
    const mergedArr = Object.entries(pointsMap).map(([team, points]) => {
      const row = {};
      row[teamCol] = team;
      row[pointsCol] = points;
      return row;
    });
    // Create merged CSV
    const mergedCsvStr = [teamCol + "," + pointsCol]
      .concat(mergedArr.map(row => `${row[teamCol]},${row[pointsCol]}`))
      .join("\n");
    setMergedCsv(mergedCsvStr);
  }

  // Handle file upload
  function handleFile(e, setter) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setter(ev.target.result);
    reader.readAsText(file);
  }

  return (
    <div className="card rounded-lg p-4 sm:p-6 shadow-sm border" style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-color)" }}>
      <h2 className="text-lg sm:text-xl font-bold mb-4" style={{ color: "var(--text-primary)" }}>Step 3: Combine Results</h2>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-primary)" }}>CSV File 1</label>
          <input type="file" accept=".csv" onChange={e => handleFile(e, setCsv1)} className="block w-full text-sm border rounded-lg p-2" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-primary)" }}>CSV File 2</label>
          <input type="file" accept=".csv" onChange={e => handleFile(e, setCsv2)} className="block w-full text-sm border rounded-lg p-2" />
        </div>
        <button onClick={mergeCsvs} className="w-full font-medium py-3 px-4 rounded-lg transition-all duration-200 text-sm bg-purple-600 text-white mt-4">Merge Points</button>
        {mergedCsv && (
          <div className="mt-4">
            <h3 className="text-base font-semibold mb-2" style={{ color: "var(--text-primary)" }}>Merged CSV</h3>
            <textarea value={mergedCsv} readOnly rows={10} className="w-full border rounded-lg p-2 text-sm" style={{ backgroundColor: "var(--bg-secondary)", color: "var(--text-primary)" }} />
            <a
              href={`data:text/csv;charset=utf-8,${encodeURIComponent(mergedCsv)}`}
              download="merged.csv"
              className="inline-block mt-2 px-4 py-2 bg-green-600 text-white rounded-lg font-semibold shadow hover:bg-green-700 transition-colors duration-200"
            >
              Download Merged CSV
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
