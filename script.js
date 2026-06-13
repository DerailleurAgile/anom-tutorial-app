// script.js - Core logic for the ANOM & ANOR Interactive Simulator
// This script handles data input, calculations for ANOM and ANOR limits, 
// and dynamic rendering of results and charts.
// Constants for scaling coefficients (m = 5 groups, n = 4 per group)
// Sourced standard lookup parameters for Wheeler/SPC configurations
const SCALING_FACTORS = {
    ANOM: {
        "0.01": 0.797,
        "0.05": 0.620,
        "0.10": 0.540
    },
    ANOR: {
        "0.01": 2.260,
        "0.05": 1.991,
        "0.10": 1.862
    }
};

// Loaded with case study sample data from the article (m=5, n=4)
let rawData = [
    [250, 260, 230, 270], // Coating A
    [310, 330, 280, 360], // Coating B
    [250, 230, 220, 260], // Coating C
    [340, 270, 300, 320], // Coating D
    [250, 240, 270, 290]  // Coating E
];

function initTable() {
    const tbody = document.getElementById('data-table-body');
    tbody.innerHTML = '';
    rawData.forEach((row, gIdx) => {
        let tr = document.createElement('tr');
        let labelTd = document.createElement('td');
        labelTd.innerHTML = `<b>G${gIdx + 1}</b>`;
        tr.appendChild(labelTd);

        row.forEach((val, rIdx) => {
            let td = document.createElement('td');
            let input = document.createElement('input');
            input.type = 'number';
            input.value = val;
            input.oninput = (e) => {
                rawData[gIdx][rIdx] = Number(e.target.value) || 0;
                calculateAndRender();
            };
            td.appendChild(input);
            tr.appendChild(td);
        });

        let meanTd = document.createElement('td');
        meanTd.id = `mean-g${gIdx}`;
        let rangeTd = document.createElement('td');
        rangeTd.id = `range-g${gIdx}`;
        
        tr.appendChild(meanTd);
        tr.appendChild(rangeTd);
        tbody.appendChild(tr);
    });
}

function calculateAndRender() {
    let groupMeans = [];
    let groupRanges = [];
    
    rawData.forEach((row, idx) => {
        let sum = row.reduce((a, b) => a + b, 0);
        let avg = sum / row.length;
        let min = Math.min(...row);
        let max = Math.max(...row);
        let range = max - min;
        
        groupMeans.push(avg);
        groupRanges.push(range);

        document.getElementById(`mean-g${idx}`).innerText = avg.toFixed(2);
        document.getElementById(`range-g${idx}`).innerText = range;
    });

    let grandMean = groupMeans.reduce((a,b)=>a+b,0) / groupMeans.length;
    let avgRange = groupRanges.reduce((a,b)=>a+b,0) / groupRanges.length;

    document.getElementById('grand-mean-val').innerText = grandMean.toFixed(2);
    document.getElementById('avg-range-val').innerText = avgRange.toFixed(2);

    // Get checked alpha inputs
    let anomAlpha = document.querySelector('input[name="anom_alpha"]:checked').value;
    let anorAlpha = document.querySelector('input[name="anor_alpha"]:checked').value;

    let h_alpha = SCALING_FACTORS.ANOM[anomAlpha];
    let D_alpha = SCALING_FACTORS.ANOR[anorAlpha];

    // Limits Math
    let anor_UDL = D_alpha * avgRange;
    let anom_delta = h_alpha * avgRange;
    let anom_UDL = grandMean + anom_delta;
    let anom_LDL = grandMean - anom_delta;

    // Render Formulas Visual Strings
    document.getElementById('anor-math').innerHTML = 
        `UDL = ANOR<sub>&alpha;</sub> * R̄<br>` +
        `UDL = ${D_alpha} * ${avgRange.toFixed(2)} = <b>${anor_UDL.toFixed(2)}</b>`;

    document.getElementById('anom-math').innerHTML = 
        `Limits = X̿ &plusmn; (ANOM<sub>&alpha;</sub> * R̄)<br>` +
        `Limits = ${grandMean.toFixed(2)} &plusmn; (${h_alpha} * ${avgRange.toFixed(2)}) = <b>${anom_LDL.toFixed(2)} to ${anom_UDL.toFixed(2)}</b>`;

    // Check alerts
    let rangeSignal = groupRanges.some(r => r > anor_UDL);
    let meanSignal = groupMeans.some(m => m > anom_UDL || m < anom_LDL);

    let anorAlert = document.getElementById('anor-alert');
    if(rangeSignal) {
        anorAlert.className = "alert-zone alert-danger";
        anorAlert.innerText = "⚠️ SIGNAL DETECTED: Within-group variance is uneven! This inflates R̄ and desensitizes the ANOM limits.";
    } else {
        anorAlert.className = "alert-zone alert-success";
        anorAlert.innerText = "✓ Within-group variance is stable. The baseline R̄ is robust.";
    }

    let anomAlert = document.getElementById('anom-alert');
    if(meanSignal) {
        anomAlert.className = "alert-zone alert-success";
        anomAlert.innerText = "🎯 SIGNAL DETECTED: Significant differences found across treatment means!";
    } else {
        anomAlert.className = "alert-zone alert-neutral";
        anomAlert.innerText = "No significant difference detected among treatment averages.";
    }

    // Render Canvas Charts
    drawChart('anorChart', groupRanges, avgRange, anor_UDL, 0, "Range");
    drawChart('anomChart', groupMeans, grandMean, anom_UDL, anom_LDL, "Mean");
}

function drawChart(canvasId, points, center, udl, ldl, mode) {
    const canvas = document.getElementById(canvasId);
    const ctx = canvas.getContext('2d');
    
    // Handle high DPI crisp rendering
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;
    ctx.clearRect(0,0, w, h);

    // Find scale bounds
    let allValues = [...points, center, udl, ldl];
    let maxVal = Math.max(...allValues) * 1.15;
    let minVal = mode === "Range" ? 0 : Math.min(...allValues) * 0.85;

    function getY(val) {
        return h - 20 - ((val - minVal) / (maxVal - minVal)) * (h - 35);
    }

    function getX(idx) {
        return 40 + (idx / (points.length - 1)) * (w - 70);
    }

    // Draw boundaries lines
    ctx.lineWidth = 1.5;
    
    // Centerline
    ctx.strokeStyle = '#6c757d';
    ctx.setLineDash([5, 3]);
    ctx.beginPath();
    ctx.moveTo(30, getY(center)); ctx.lineTo(w-10, getY(center));
    ctx.stroke();
    ctx.fillStyle = '#6c757d';
    ctx.font = '10px Arial';
    ctx.fillText(mode === "Range" ? "R̄" : "X̿", 10, getY(center) + 3);

    // Upper Limit
    ctx.strokeStyle = '#dc3545';
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(30, getY(udl)); ctx.lineTo(w-10, getY(udl));
    ctx.stroke();
    ctx.fillStyle = '#dc3545';
    ctx.fillText("UDL", 10, getY(udl) + 3);

    // Lower Limit if applicable
    if(mode === "Mean") {
        ctx.strokeStyle = '#dc3545';
        ctx.beginPath();
        ctx.moveTo(30, getY(ldl)); ctx.lineTo(w-10, getY(ldl));
        ctx.stroke();
        ctx.fillStyle = '#dc3545';
        ctx.fillText("LDL", 10, getY(ldl) + 3);
    }

    // Draw connecting path and data points
    ctx.strokeStyle = '#0d6efd';
    ctx.lineWidth = 2;
    ctx.beginPath();
    points.forEach((pt, idx) => {
        if(idx === 0) ctx.moveTo(getX(idx), getY(pt));
        else ctx.lineTo(getX(idx), getY(pt));
    });
    ctx.stroke();

    // Data nodes
    points.forEach((pt, idx) => {
        let isOut = pt > udl || (mode === "Mean" && pt < ldl);
        ctx.fillStyle = isOut ? '#dc3545' : '#0d6efd';
        ctx.beginPath();
        ctx.arc(getX(idx), getY(pt), isOut ? 5 : 3.5, 0, Math.PI*2);
        ctx.fill();
        
        // Labels for configurations
        ctx.fillStyle = '#212529';
        ctx.font = '9px Arial';
        ctx.fillText(`G${idx+1}`, getX(idx) - 6, h - 4);
    });
}

// Attach Event Handlers dynamically to handle system configuration updates
document.querySelectorAll('input[name="anom_alpha"]').forEach(r => r.addEventListener('change', calculateAndRender));
document.querySelectorAll('input[name="anor_alpha"]').forEach(r => r.addEventListener('change', calculateAndRender));
window.addEventListener('resize', calculateAndRender);

// Bootstrap app state
initTable();
calculateAndRender();
