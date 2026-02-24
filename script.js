// ==========================================
// 1. Global State & Initialization
// ==========================================
let currentStep = 1;
let donutChartInstance = null;
let lineChartInstance = null;
let dataHasil = null; // TAMBAHKAN INI agar bisa diakses exportToPDF

// API Key aman dalam Base64
const BaseCode = "QUl6YVN5QXlobkVHd0JuVTBYcGVrb1JickVZMVJ1eEJ1ZUV6dk9R";
const GEMINI_API_KEY = atob(BaseCode);
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

// Load data saat pertama kali dibuka
window.onload = () => {
  tampilkanRiwayat();
};

// ==========================================
// 2. Utility Functions (Formatting & Helpers)
// ==========================================
function formatInputRibuan(e) {
  let value = e.target.value.replace(/[^0-9]/g, "");
  if (value) {
    e.target.value = new Intl.NumberFormat("id-ID").format(value);
  } else {
    e.target.value = "";
  }
}

function getNumberValue(idOrElement) {
  let el =
    typeof idOrElement === "string"
      ? document.getElementById(idOrElement)
      : idOrElement;
  if (!el || !el.value) return 0;
  return parseFloat(el.value.replace(/\./g, "")) || 0;
}

function formatRupiah(angka) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(angka);
}

// ==========================================
// 3. Navigation & Section Logic
// ==========================================

function showSection(sectionId) {
  document
    .querySelectorAll("section")
    .forEach((s) => s.classList.add("hidden"));
  document.getElementById(sectionId).classList.remove("hidden");

  // Update warna icon di mobile nav
  const navButtons = document.querySelectorAll(".mobile-nav button");
  navButtons.forEach((btn) => {
    btn.classList.remove("text-blue-600");
    btn.classList.add("text-slate-400");
  });
  // Tambahkan logika warna aktif di sini jika perlu
}

function nextStep(step) {
  if (step === 2) {
    const name = document.getElementById("productName").value;
    const unit = getNumberValue("jumlahUnit");
    if (!name || unit <= 0) {
      Swal.fire({
        icon: "error",
        title: "Oops!",
        text: "Isi nama produk dan jumlah unit dulu.",
      });
      return;
    }
  }
  document
    .querySelectorAll(".wizard-step")
    .forEach((s) => s.classList.add("hidden"));
  document.getElementById(`step-${step}`).classList.remove("hidden");

  // Update progress dots
  for (let i = 1; i <= 3; i++) {
    const dot = document.getElementById(`dot-${i}`);
    if (i <= step) dot.classList.add("active");
    else dot.classList.remove("active");
  }
  currentStep = step;
}

function resetForm() {
  Swal.fire({
    title: "Reset Kalkulator?",
    text: "Semua data input saat ini akan hilang.",
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#3b82f6",
    confirmButtonText: "Ya, Reset",
  }).then((result) => {
    if (result.isConfirmed) location.reload();
  });
}

function simpanKeRiwayat(data) {
  if (!data) {
    Swal.fire({
      icon: "warning",
      title: "Data Belum Ada",
      text: "Silakan lakukan perhitungan HPP terlebih dahulu sebelum menyimpan.",
    });
    return;
  }

  let riwayat = JSON.parse(localStorage.getItem("hpp_history") || "[]");

  // Perbaikan: Masukkan semua detail biaya ke dalam objek riwayat
  riwayat.unshift({
    nama: data.nama,
    hpp: formatRupiah(data.hppPerUnit),
    tanggal: data.tanggal,
    // Tambahkan baris di bawah ini:
    totalBahan: data.totalBahan,
    totalTenaga: data.totalTenaga,
    totalOverhead: data.totalOverhead,
  });

  riwayat = riwayat.slice(0, 10);
  localStorage.setItem("hpp_history", JSON.stringify(riwayat));

  Swal.fire({
    icon: "success",
    title: "Tersimpan!",
    text: `Data ${data.nama} telah masuk ke histori.`,
    timer: 1500,
    showConfirmButton: false,
  });

  tampilkanRiwayat();
}
// ==========================================
// 4. Dynamic Row & Auto Calculation
// ==========================================

function addItemRow(containerId, prefix) {
  const container = document.getElementById(containerId + "Container");
  const div = document.createElement("div");
  // Perubahan: Menambahkan 'w-full' dan memastikan flex container tidak kaku
  div.className =
    "flex items-center gap-2 mb-2 animate-in slide-in-from-left-2 duration-300 w-full";

  div.innerHTML = `
        <input type="text" placeholder="Nama item" class="flex-[2] min-w-0 px-3 py-2 bg-slate-50 rounded-lg text-sm outline-none border focus:border-blue-400 input-name">
        
        <input type="number" placeholder="Rp" class="flex-1 min-w-0 px-3 py-2 bg-slate-50 rounded-lg text-sm outline-none border focus:border-blue-400 input-cost-formatted">
        
        <button type="button" onclick="this.parentElement.remove(); kalkulasiUlangOtomatis()" class="flex-none text-red-400 hover:text-red-600 p-2">
            <i class="ph ph-trash"></i>
        </button>
    `;
  container.appendChild(div);

  const inputCost = div.querySelector(".input-cost-formatted");
  inputCost.addEventListener("input", (e) => {
    formatInputRibuan(e);
    kalkulasiUlangOtomatis();
  });
}

function kalkulasiUlangOtomatis() {
  const totalBB = hitungTotalDariContainer("bahanBakuContainer");
  const totalLain = hitungTotalDariContainer("biayaLainLainContainer");
  document.getElementById("totalBahanBakuDisplay").innerText =
    formatRupiah(totalBB);
  document.getElementById("totalLainLainDisplay").innerText =
    formatRupiah(totalLain);
}

function hitungTotalDariContainer(containerId) {
  const inputs = document.querySelectorAll(
    `#${containerId} .input-cost-formatted`,
  );
  let total = 0;
  inputs.forEach((input) => (total += getNumberValue(input)));
  return total;
}

// Event listener untuk input statis
document
  .getElementById("biayaTenagaKerja")
  .addEventListener("input", formatInputRibuan);
document
  .getElementById("jumlahUnit")
  .addEventListener("input", formatInputRibuan);

// ==========================================
// 5. Core HPP Calculation
// ==========================================

// Cari bagian hpp-form.addEventListener
document.getElementById("hpp-form").addEventListener("submit", function (e) {
  e.preventDefault();

  const unit = getNumberValue("jumlahUnit") || 1;
  const bb = hitungTotalDariContainer("bahanBakuContainer");
  const overhead = hitungTotalDariContainer("biayaLainLainContainer");
  const tenaga = getNumberValue("biayaTenagaKerja");

  // Deklarasikan variabel totalBiaya di sini agar bisa digunakan di bawah
  const totalBiaya = bb + overhead + tenaga;
  const hppPerUnit = totalBiaya / unit;

  if (totalBiaya <= 0) {
    Swal.fire({
      icon: "warning",
      title: "Data Kosong",
      text: "Masukkan biaya produksi terlebih dahulu.",
    });
    return;
  }

  // Panggil fungsi tampilkanHasil dengan variabel yang sudah dihitung
  tampilkanHasil(totalBiaya, hppPerUnit);
});

function tampilkanHasil(total, hpp) {
  // 1. Simpan ke Global State agar exportToPDF bisa membaca datanya
  dataHasil = {
    nama: document.getElementById("productName").value || "Produk",
    qty: getNumberValue("jumlahUnit") || 0,
    totalBahan: hitungTotalDariContainer("bahanBakuContainer"),
    totalTenaga: getNumberValue("biayaTenagaKerja"),
    totalOverhead: hitungTotalDariContainer("biayaLainLainContainer"),
    totalProduksi: total, // Menggunakan parameter 'total' dari atas
    hppPerUnit: hpp, // Menggunakan parameter 'hpp' dari atas
    tanggal: new Date().toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }),
  };

  // 2. Update Tampilan Dashboard
  document.getElementById("step-2").classList.add("hidden");
  document.getElementById("hasil-perhitungan").classList.remove("hidden");
  document.getElementById("outputTotalBiaya").innerText = formatRupiah(total);
  document.getElementById("outputHPPUnit").innerText = formatRupiah(hpp);
  document.getElementById("dot-3").classList.add("active");

  // 3. Jalankan Fungsi Pendukung
  updateCharts();
  hitungHargaJual();
}

// ==========================================
// 6. Visual Insights (Charts with Labels)
// ==========================================

function updateCharts() {
  const ctxDonut = document.getElementById("donutChart");
  const ctxLine = document.getElementById("lineChart");

  const bb = hitungTotalDariContainer("bahanBakuContainer");
  const overhead = hitungTotalDariContainer("biayaLainLainContainer");
  const tenaga = getNumberValue("biayaTenagaKerja");
  const total = bb + overhead + tenaga;

  if (donutChartInstance) donutChartInstance.destroy();
  donutChartInstance = new Chart(ctxDonut, {
    type: "doughnut",
    data: {
      labels: ["Bahan", "Tenaga", "Overhead"],
      datasets: [
        {
          data: [bb, tenaga, overhead],
          backgroundColor: ["#3b82f6", "#10b981", "#f59e0b"],
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            generateLabels: (chart) => {
              const data = chart.data;
              return data.labels.map((label, i) => {
                const val = data.datasets[0].data[i];
                const pct = total > 0 ? ((val / total) * 100).toFixed(1) : 0;
                return {
                  text: `${label} (${pct}%)`,
                  fillStyle: data.datasets[0].backgroundColor[i],
                  index: i,
                };
              });
            },
          },
        },
      },
    },
  });

  if (lineChartInstance) lineChartInstance.destroy();
  const allLabels = Array.from(document.querySelectorAll(".input-name")).map(
    (i) => i.value || "Item",
  );
  const allData = Array.from(
    document.querySelectorAll(".input-cost-formatted"),
  ).map((i) => getNumberValue(i));

  lineChartInstance = new Chart(ctxLine, {
    type: "line",
    data: {
      labels: allLabels.length > 0 ? allLabels : ["Data"],
      datasets: [
        {
          label: "Biaya",
          data: allData.length > 0 ? allData : [0],
          borderColor: "#3b82f6",
          backgroundColor: "rgba(59, 130, 246, 0.1)",
          fill: true,
          tension: 0.4,
        },
      ],
    },
    options: { responsive: true, maintainAspectRatio: false },
  });
}

// ==========================================
// 7. AI & Pricing Logic
// ==========================================

async function hitungHargaJual() {
  const hppText = document.getElementById("outputHPPUnit").innerText;
  const hppUnit = parseInt(hppText.replace(/[^0-9]/g, "")) || 0;
  const margin = parseFloat(document.getElementById("marginLaba").value) || 20;
  const hargaJual = hppUnit + hppUnit * (margin / 100);

  document.getElementById("marginPersenOutput").innerText = margin;
  document.getElementById("outputHargaJual").innerText = formatRupiah(
    Math.round(hargaJual),
  );
  document.getElementById("wrapperSaranManual").classList.remove("hidden");

  await getAIPriceInsights(hppUnit, Math.round(hargaJual));
}

async function getAIPriceInsights(hpp, basePrice) {
  const container = document.getElementById("ai-cards-container");
  const section = document.getElementById("ai-insight-section");
  section.classList.remove("hidden");
  container.innerHTML = `<div class="col-span-full py-4 text-center text-slate-400 text-xs animate-pulse">Menentukan Harga... </div>`;

  const promptText = `Hanya berikan JSON murni. 3 strategi harga HPP ${hpp}, Target ${basePrice}: [{"nama": "Value", "harga": 0, "alasan": ""}]`;

  try {
    const response = await fetch(GEMINI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: promptText }] }] }),
    });
    const data = await response.json();
    let rawText = data.candidates[0].content.parts[0].text;
    const jsonMatch = rawText.match(/\[[\s\S]*\]/);
    renderAICards(JSON.parse(jsonMatch[0]));
  } catch (e) {
    container.innerHTML = `<p class="col-span-full text-center text-[10px] text-slate-400">AI sedang sibuk. Silakan coba klik update.</p>`;
  }
}

function renderAICards(items) {
  const container = document.getElementById("ai-cards-container");

  // SIMPAN DATA AI KE GLOBAL STATE
  if (dataHasil) {
    dataHasil.aiRecommendations = items;
  }

  container.innerHTML = items
    .map(
      (item) => `
            <div class="bg-white p-3 rounded-xl border border-slate-100 shadow-sm transition-hover">
                <p class="text-[9px] font-bold text-blue-600 uppercase">${item.nama}</p>
                <p class="text-md font-bold">${formatRupiah(item.harga)}</p>
                <p class="text-[9px] text-slate-500 leading-tight">${item.alasan}</p>
            </div>
        `,
    )
    .join("");
}

// ==========================================
// 8. History & PDF Export
// ==========================================

function tampilkanRiwayat() {
  const container = document.getElementById("riwayat-list");
  const riwayat = JSON.parse(localStorage.getItem("hpp_history") || "[]");

  if (riwayat.length === 0) {
    container.innerHTML = `
            <div class="text-center py-20 bg-white/50 rounded-3xl border-2 border-dashed border-slate-200">
                <i class="ph ph-folder-open text-5xl text-slate-200 mb-2"></i>
                <p class="text-slate-400">Belum ada data tersimpan</p>
            </div>`;
    return;
  }

  container.innerHTML = riwayat
    .map(
      (item, index) => `
        <div class="glass-card p-5 bg-white flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-l-4 border-l-blue-500 hover:shadow-md transition-all">
            <div class="flex items-center gap-4">
                <div class="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
                    <i class="ph-fill ph-package text-2xl"></i>
                </div>
                <div>
                    <h4 class="font-bold text-slate-800 text-lg">${item.nama}</h4>
                    <div class="flex items-center gap-2 text-[11px] text-slate-400">
                        <i class="ph ph-calendar"></i> ${item.tanggal}
                    </div>
                </div>
            </div>
            
            <div class="flex items-center gap-6 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 pt-3 md:pt-0">
                <div class="text-left md:text-right">
                    <p class="text-[10px] text-slate-400 uppercase font-black tracking-wider">HPP / Unit</p>
                    <p class="text-xl font-black text-blue-600">${item.hpp}</p>
                </div>
            </div>
        </div>
    `,
    )
    .join("");
}

// Tambahan fungsi untuk menghapus
function hapusRiwayatSatu(index) {
  let riwayat = JSON.parse(localStorage.getItem("hpp_history") || "[]");
  riwayat.splice(index, 1);
  localStorage.setItem("hpp_history", JSON.stringify(riwayat));
  tampilkanRiwayat();
}

function hapusSemuaRiwayat() {
  Swal.fire({
    title: "Hapus Semua?",
    text: "Seluruh riwayat perhitungan akan dihapus permanen.",
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#ef4444",
    confirmButtonText: "Ya, Hapus Semua",
  }).then((result) => {
    if (result.isConfirmed) {
      localStorage.removeItem("hpp_history");
      tampilkanRiwayat();
    }
  });
}

function tampilkanRiwayat() {
  const container = document.getElementById("riwayat-list");
  const riwayat = JSON.parse(localStorage.getItem("hpp_history") || "[]");

  if (riwayat.length === 0) return;

  container.innerHTML = riwayat
    .map(
      (item, index) => `
        <div class="glass-card p-4 flex justify-between items-center bg-white cursor-pointer hover:bg-blue-50 transition-colors" 
             onclick="lihatDetail(${index})">
            <div>
                <h4 class="font-bold text-slate-800">${item.nama}</h4>
                <p class="text-[10px] text-slate-400">${item.tanggal}</p>
            </div>
            <div class="flex items-center gap-4">
                <div class="text-right">
                    <p class="text-blue-600 font-bold">${item.hpp}</p>
                    <p class="text-[10px] text-slate-400 uppercase font-bold">HPP/Unit</p>
                </div>
                <button onclick="event.stopPropagation(); hapusRiwayatSatu(${index})" class="p-2 text-red-400">
                    <i class="ph ph-trash"></i>
                </button>
            </div>
        </div>
    `,
    )
    .join("");
}

// Perbaikan Fungsi Export PDF
function exportToWord() {
  if (!dataHasil) {
    Swal.fire(
      "Data Kosong",
      "Lakukan perhitungan sampai saran AI muncul!",
      "error",
    );
    return;
  }

  // Mengambil rincian item bahan baku dari input aktif
  const bahanBakuItems = Array.from(
    document.querySelectorAll("#bahanBakuContainer div"),
  ).map((div) => ({
    nama: div.querySelector(".input-name")?.value || "Item Bahan",
    biaya: div.querySelector(".input-cost-formatted")?.value || "0",
  }));

  // Mengambil rincian biaya lain-lain
  const biayaLainItems = Array.from(
    document.querySelectorAll("#biayaLainLainContainer div"),
  ).map((div) => ({
    nama: div.querySelector(".input-name")?.value || "Biaya Lain",
    biaya: div.querySelector(".input-cost-formatted")?.value || "0",
  }));

  // Membuat konten tabel AI jika data tersedia
  const aiRows = dataHasil.aiRecommendations
    ? dataHasil.aiRecommendations
        .map(
          (item) => `
        <tr>
            <td><b>${item.nama}</b></td>
            <td>${formatRupiah(item.harga)}</td>
            <td style="font-size: 10px;">${item.alasan}</td>
        </tr>`,
        )
        .join("")
    : "<tr><td colspan='3'>Data AI tidak tersedia</td></tr>";

  const content = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head><meta charset='utf-8'>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
        .header { text-align: center; border-bottom: 2px solid #3b82f6; padding-bottom: 10px; }
        table { width: 100%; border-collapse: collapse; margin-top: 15px; }
        th, td { border: 1px solid #dee2e6; padding: 10px; text-align: left; }
        th { background-color: #f8f9fa; color: #333; font-weight: bold; }
        .section-header { background-color: #3b82f6; color: white; padding: 8px; font-weight: bold; margin-top: 20px; }
        .footer { font-size: 9px; color: #777; margin-top: 30px; text-align: center; }
    </style>
    </head>
    <body>
        <div class="header">
            <h2>LAPORAN ANALISIS BIAYA PRODUKSI</h2>
            <p>Produk: ${dataHasil.nama} | Tanggal: ${dataHasil.tanggal}</p>
        </div>

        <div class="section-header">RINCIAN BIAYA PRODUKSI</div>
        <table>
            <thead><tr><th>Kategori</th><th>Rincian Item</th><th>Nilai Biaya</th></tr></thead>
            <tbody>
                ${bahanBakuItems.map((item) => `<tr><td>Bahan Baku</td><td>${item.nama}</td><td>Rp ${item.biaya}</td></tr>`).join("")}
                <tr><td>Tenaga Kerja</td><td>Biaya SDM</td><td>${formatRupiah(dataHasil.totalTenaga)}</td></tr>
                ${biayaLainItems.map((item) => `<tr><td>Overhead</td><td>${item.nama}</td><td>Rp ${item.biaya}</td></tr>`).join("")}
                <tr style="background-color: #e9ecef; font-weight: bold;">
                    <td colspan="2">TOTAL BIAYA PRODUKSI (${dataHasil.qty} Unit)</td>
                    <td>${formatRupiah(dataHasil.totalProduksi)}</td>
                </tr>
            </tbody>
        </table>

        <div class="section-header">ANALISIS HARGA POKOK PRODUKSI (HPP)</div>
        <table>
            <tr><td>HPP PER UNIT</td><td><b>${formatRupiah(dataHasil.hppPerUnit)}</b></td></tr>
        </table>

        <div class="section-header">REKOMENDASI STRATEGI HARGA (AI INSIGHT)</div>
        <table>
            <thead><tr><th>Strategi</th><th>Saran Harga</th><th>Alasan Analisis</th></tr></thead>
            <tbody>
                ${aiRows}
            </tbody>
        </table>

        <div class="footer">
            Laporan ini dihasilkan secara otomatis oleh sistem HPPyCalc Pro berlisensi. 
            Data di atas merupakan hasil kalkulasi sistem berdasarkan parameter yang dimasukkan oleh pengguna.
        </div>
    </body>
    </html>`;

  const converted = htmlDocx.asBlob(content);
  const link = document.createElement("a");
  link.href = URL.createObjectURL(converted);
  link.download = `Laporan_Lengkap_${dataHasil.nama}.docx`;
  link.click();
}

function lihatDetail(index) {
  const riwayat = JSON.parse(localStorage.getItem("hpp_history") || "[]");
  const data = riwayat[index];

  if (!data) return;

  // Membuat konten ringkasan yang rapi
  let htmlContent = `
        <div class="text-left text-sm space-y-3">
            <div class="p-3 bg-blue-50 rounded-lg">
                <p class="text-blue-600 font-bold uppercase text-[10px]">Ringkasan Produksi</p>
                <p class="text-slate-700">Produk: <b>${data.nama}</b></p>
                <p class="text-slate-700">Tanggal: ${data.tanggal}</p>
            </div>
            
            <div class="space-y-1">
                <div class="flex justify-between border-b pb-1">
                    <span>Bahan Baku</span>
                    <span class="font-medium">${data.totalBahan ? formatRupiah(data.totalBahan) : "-"}</span>
                </div>
                <div class="flex justify-between border-b pb-1">
                    <span>Tenaga Kerja</span>
                    <span class="font-medium">${data.totalTenaga ? formatRupiah(data.totalTenaga) : "-"}</span>
                </div>
                <div class="flex justify-between border-b pb-1">
                    <span>Overhead</span>
                    <span class="font-medium">${data.totalOverhead ? formatRupiah(data.totalOverhead) : "-"}</span>
                </div>
            </div>

            <div class="p-3 bg-slate-900 text-white rounded-lg flex justify-between items-center">
                <span class="text-[10px] uppercase font-bold">HPP per Unit</span>
                <span class="text-lg font-bold">${data.hpp}</span>
            </div>
        </div>
    `;

  Swal.fire({
    title: "Detail Perhitungan",
    html: htmlContent,
    confirmButtonText: "Tutup",
    confirmButtonColor: "#3b82f6",
    showCloseButton: true,
  });
}


