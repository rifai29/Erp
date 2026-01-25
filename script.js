let activeKey = 'default';
// --- MODIFIKASI: CEK ROLE ---
let isReadOnly = sessionStorage.getItem('erp_role') === 'viewer'; 
let currentPage = 1, rowsPerPage = 10;
let selectedRowIdx = null, selectedColIdx = null, searchQuery = "";
let dateFilter = { start: "", end: "" };
let openCats = JSON.parse(localStorage.getItem('erp_open_cats')) || ["UTAMA"];

let config = JSON.parse(localStorage.getItem('erp_clean_conf')) || {
    default: { title: "DASHBOARD UTAMA", category: "UTAMA", order: 0, cols: ["TANGGAL", "KETERANGAN", "DEBIT", "KREDIT", "SALDO"] }
};
let dataStore = JSON.parse(localStorage.getItem('erp_clean_data')) || {
    default: [["2024-01-01", "Saldo Awal", "0", "0", "0"]]
};

const fp = flatpickr("#dateRangePicker", {
    mode: "range", dateFormat: "Y-m-d",
    onReady: function(s, d, instance) {
        const btn = document.createElement("div");
        btn.innerHTML = "HAPUS FILTER TANGGAL"; btn.className = "flatpickr-clear-button";
        btn.onclick = () => { dateFilter = {start:"", end:""}; instance.clear(); render(); };
        instance.calendarContainer.appendChild(btn);
    },
    onClose: function(s, dateStr) {
        if (s.length === 2) {
            const dates = dateStr.split(" to ");
            dateFilter.start = dates[0]; dateFilter.end = dates[1]; render();
        }
    }
});

// --- MODIFIKASI: LOGIN DUA AKUN ---
function login() {
    const u = document.getElementById('u').value, p = document.getElementById('p').value;
    if (u === 'P' && p === 'p') { 
        sessionStorage.setItem('erp_is_logged', 'true'); 
        sessionStorage.setItem('erp_role', 'admin');
        location.reload(); 
    } else if (u === 'O' && p === 'o') {
        sessionStorage.setItem('erp_is_logged', 'true');
        sessionStorage.setItem('erp_role', 'viewer');
        location.reload();
    } else { 
        alert("Username atau Password salah!"); 
    }
}
if (sessionStorage.getItem('erp_is_logged') === 'true') document.getElementById('login-screen').style.display = 'none';

// --- MODIFIKASI: LOCK SAVE JIKA READONLY ---
function autoSave() { 
    if (isReadOnly) return;
    localStorage.setItem('erp_clean_conf', JSON.stringify(config)); 
    localStorage.setItem('erp_clean_data', JSON.stringify(dataStore)); 
}

function renderSidebar() {
    const cats = [...new Set(Object.values(config).map(t => t.category || "UTAMA"))];
    let html = '';
    cats.forEach(cat => {
        const isOpen = openCats.includes(cat);
        const tables = Object.keys(config).filter(k => (config[k].category || "UTAMA") === cat).sort((a,b) => (config[a].order || 0) - (config[b].order || 0));
        html += `<div class="cat-group"><button class="cat-header" onclick="toggleCat('${cat}')">${cat} <span>${isOpen ? 'CLOSE' : 'OPEN'}</span></button>
            <div class="cat-content ${isOpen ? 'active' : ''}">${tables.map(k => `<button class="tab-btn ${activeKey === k ? 'active' : ''}" onclick="switchTab('${k}')">${config[k].title}</button>`).join('')}</div></div>`;
    });
    document.getElementById('sidebar-content').innerHTML = html;
}

function toggleCat(cat) {
    if(openCats.includes(cat)) openCats = openCats.filter(c => c !== cat); else openCats.push(cat);
    localStorage.setItem('erp_open_cats', JSON.stringify(openCats)); renderSidebar();
}

function render() {
    renderSidebar(); document.getElementById('disp-title').innerText = config[activeKey].title;
    let allCols = config[activeKey].cols;
    let hHtml = `<th class="row-num">ID</th>`;
    // --- MODIFIKASI: HAPUS TEKS 'EDIT' JIKA READONLY ---
    allCols.forEach((c, i) => { 
        hHtml += `<th><div class="th-inner" onclick="${isReadOnly ? '' : `openFilter(${i})`}">${c} ${isReadOnly ? '' : 'EDIT'}</div></th>`; 
    });
    document.getElementById('table-head').innerHTML = hHtml;
    
    let filtered = dataStore[activeKey].map((row, index) => ({row, index}));
    if(searchQuery) filtered = filtered.filter(i => i.row.some(c => c.toString().toLowerCase().includes(searchQuery.toLowerCase())));
    if(dateFilter.start && dateFilter.end) filtered = filtered.filter(i => { let d = (i.row[0] || "").trim(); return d >= dateFilter.start && d <= dateFilter.end; });
    
    let totalPages = Math.ceil(filtered.length / rowsPerPage) || 1;
    let paginated = filtered.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);
    
    // --- MODIFIKASI: LOCK INPUT & POPUP JIKA READONLY ---
    document.getElementById('table-body').innerHTML = paginated.map(item => `<tr>
        <td class="row-num" onclick="${isReadOnly ? '' : `openPopUp(${item.index})`}">${item.index + 1}</td>
        ${item.row.map((cell, ci) => `<td><input type="text" value="${cell}" ${isReadOnly ? 'readonly' : ''} oninput="upd(${item.index},${ci},this.value)"></td>`).join('')}
    </tr>`).join('');
    
    document.getElementById('page-info').innerText = `HALAMAN: ${currentPage} / ${totalPages}`;
    
    // Sembunyikan tombol admin secara visual jika login sebagai user
    if (isReadOnly) {
        const adminElements = document.querySelectorAll('.toolbar button:nth-child(2), #sidebar button[onclick="openTableManager()"]');
        adminElements.forEach(el => el.style.display = 'none');
    }
}

function openCatPicker() {
    if(isReadOnly) return;
    const cats = [...new Set(Object.values(config).map(t => t.category || "UTAMA"))];
    let html = '<p style="font-size:12px; margin-bottom:10px; color:grey;">Pilih Kategori:</p>';
    cats.forEach(c => { html += `<div class="cat-item-select" onclick="selectExistingCat('${c}')">FOLDER: ${c}</div>`; });
    document.getElementById('cat-list-box').innerHTML = html;
    document.getElementById('sheet-cat-picker').classList.add('active');
}
function selectExistingCat(catName) { config[activeKey].category = catName; autoSave(); render(); closeCatPicker(); closeModal(); }
function applyNewCat() { let val = document.getElementById('newCatInp').value; if(val) { selectExistingCat(val.toUpperCase()); document.getElementById('newCatInp').value = ""; } }
function closeCatPicker() { document.getElementById('sheet-cat-picker').classList.remove('active'); }
function renameTable() { if(isReadOnly) return; let n = prompt("NAMA BARU:", config[activeKey].title); if(n){config[activeKey].title = n.toUpperCase(); autoSave(); render(); closeModal();} }
function moveTable(dir) {
    if(isReadOnly) return;
    let keys = Object.keys(config).filter(k => config[k].category === config[activeKey].category).sort((a,b) => (config[a].order || 0) - (config[b].order || 0));
    let idx = keys.indexOf(activeKey);
    if(dir==='up' && idx > 0) [config[keys[idx]].order, config[keys[idx-1]].order] = [config[keys[idx-1]].order, config[keys[idx]].order];
    else if(dir==='down' && idx < keys.length-1) [config[keys[idx]].order, config[keys[idx+1]].order] = [config[keys[idx+1]].order, config[keys[idx]].order];
    autoSave(); render();
}
function createNewTable() { 
    if(isReadOnly) return;
    let n = prompt("NAMA TABEL BARU:"); 
    if (n) { 
        let k = 't' + Date.now(); 
        config[k] = { title: n.toUpperCase(), category: config[activeKey].category, order: 99, cols: ["TANGGAL", "KETERANGAN"] }; 
        dataStore[k] = [[new Date().toISOString().split('T')[0], ""]]; 
        activeKey = k; autoSave(); render(); closeModal(); 
    } 
}
function deleteCurrentTable() { if(!isReadOnly && Object.keys(config).length > 1 && confirm("Hapus tabel ini?")){ delete config[activeKey]; delete dataStore[activeKey]; activeKey = Object.keys(config)[0]; autoSave(); render(); closeModal(); } }
function deleteCategory() {
    if(isReadOnly) return;
    let cat = prompt("Nama Kategori yang akan dihapus:");
    if(cat && confirm(`Hapus kategori ${cat.toUpperCase()}?`)) {
        Object.keys(config).forEach(k => { if(config[k].category === cat.toUpperCase()) config[k].category = "UTAMA"; });
        autoSave(); render(); closeModal();
    }
}
function changePage(p) { let t = Math.ceil(dataStore[activeKey].length/rowsPerPage) || 1; if(p >= 1 && p <= t) { currentPage = p; render(); } }
function switchTab(k) { activeKey = k; currentPage = 1; render(); closeAll(); }
function upd(r, c, v) { if(isReadOnly) return; dataStore[activeKey][r][c] = v; autoSave(); }
function doSearch() { searchQuery = document.getElementById('searchInp').value; currentPage = 1; render(); }
function openPopUp(idx) { if(isReadOnly) return; selectedRowIdx = idx; document.getElementById('sheet-menu').classList.add('active'); document.getElementById('overlay').classList.add('active'); }
function openFilter(colIdx) { if(isReadOnly) return; selectedColIdx = colIdx; document.getElementById('sheet-filter').classList.add('active'); document.getElementById('overlay').classList.add('active'); }
function openTableManager() { if(isReadOnly) return; document.getElementById('sheet-table-manager').classList.add('active'); document.getElementById('overlay').classList.add('active'); }
function closeModal() { document.querySelectorAll('.sheet').forEach(s => s.classList.remove('active')); document.getElementById('overlay').classList.remove('active'); }
function toggleSidebar() { document.getElementById('sidebar').classList.toggle('active'); document.getElementById('overlay').classList.toggle('active'); }
function closeAll() { closeModal(); document.getElementById('sidebar').classList.remove('active'); }
function logout() { if(confirm("Keluar?")) { sessionStorage.clear(); location.reload(); } }
function toggleDarkMode() { document.body.classList.toggle('dark-mode'); localStorage.setItem('erp_dark', document.body.classList.contains('dark-mode')); }
if(localStorage.getItem('erp_dark') === 'true') document.body.classList.add('dark-mode');
function handleSortData(dir) { dataStore[activeKey].sort((a, b) => { let vA = (a[selectedColIdx] || "").toString(), vB = (b[selectedColIdx] || "").toString(); return dir === 'asc' ? vA.localeCompare(vB) : vB.localeCompare(vA); }); autoSave(); render(); closeModal(); }
function handleExecAction(type) {
    if (isReadOnly) return;
    if (type === 'add_row') dataStore[activeKey].push(new Array(config[activeKey].cols.length).fill(""));
    if (type === 'add_col') { let n = prompt("KOLOM BARU:"); if(n){config[activeKey].cols.push(n.toUpperCase()); dataStore[activeKey].forEach(r=>r.push(""));}}
    if (type === 'edit_header') { let n = prompt("GANTI NAMA:", config[activeKey].cols[selectedColIdx]); if(n) config[activeKey].cols[selectedColIdx]=n.toUpperCase(); }
    if (type === 'del_row') dataStore[activeKey].splice(selectedRowIdx, 1);
    if (type === 'del_col') { config[activeKey].cols.splice(selectedColIdx, 1); dataStore[activeKey].forEach(r=>r.splice(selectedColIdx,1)); }
    if (type === 'clear_all' && confirm("Hapus semua isi tabel?")) dataStore[activeKey] = [];
    autoSave(); render(); closeModal();
}
function fillColCurrentDate() { if(isReadOnly) return; let d = new Date().toISOString().split('T')[0]; dataStore[activeKey].forEach(r => r[selectedColIdx] = d); autoSave(); render(); closeModal(); }
function exportToExcel() { let ws = XLSX.utils.aoa_to_sheet([config[activeKey].cols, ...dataStore[activeKey]]); let wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Data"); XLSX.writeFile(wb, config[activeKey].title + ".xlsx"); }
function importFromExcel(e) { if(isReadOnly) return; let f = e.target.files[0]; if(!f) return; let r = new FileReader(); r.onload = (ex) => { let d = new Uint8Array(ex.target.result), wb = XLSX.read(d, {type:'array'}); let rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], {header:1, defval:""}); if(rows.length > 0) { config[activeKey].cols = rows[0].map(h => h.toString().toUpperCase()); rows.shift(); dataStore[activeKey] = rows; autoSave(); render(); } }; r.readAsArrayBuffer(f); }

render();
