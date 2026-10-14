(function (root) {
  "use strict";
  const normalize = value => String(value).normalize("NFKC").toLocaleLowerCase().replace(/\s+/g, "");
  function findProducts(records, query) {
    const needle = normalize(query);
    if (!needle) return [];
    return [...new Set(records.map(r => r.n))].filter(n => normalize(n).includes(needle))
      .sort((a, b) => (normalize(a) === needle ? -1 : normalize(b) === needle ? 1 : a.localeCompare(b, "ko")));
  }
  function annualSeries(records, name, throughMonth = 12) {
    if (!Number.isInteger(throughMonth) || throughMonth < 1 || throughMonth > 12) throw new Error("잘못된 월");
    const matches = records.filter(r => r.n === name);
    if (!matches.length) return [];
    const first = Math.min(...matches.map(r => r.y));
    const last = Math.max(...records.map(r => r.y));
    return Array.from({ length: last - first + 1 }, (_, i) => {
      const year = first + i, rows = matches.filter(r => r.y === year);
      if (!rows.length) return { year, quantity: null, revenue: null };
      let quantity = 0, revenue = 0, missingPrice = false;
      rows.forEach(r => {
        const q = r.m.slice(0, throughMonth).reduce((a, b) => a + b, 0);
        quantity += q;
        if (r.p > 0) revenue += q * r.p;
        else if (r.m.slice(0, throughMonth).some(v => v !== 0)) missingPrice = true;
      });
      return { year, quantity, revenue: missingPrice ? null : revenue };
    });
  }
  function mount(data) {
    const input = document.getElementById("productSearch");
    const results = document.getElementById("productResults");
    const status = document.getElementById("productSearchStatus");
    const detail = document.getElementById("productDetail");
    const period = document.getElementById("productThroughMonth");
    const metric = document.getElementById("productMetric");
    const more = document.getElementById("productMore");
    const previous = document.getElementById("productPrevious");
    const picker = document.getElementById("productPicker");
    const change = document.getElementById("productChange");
    const pageStatus = document.getElementById("productPageStatus");
    const pageSize = 8;
    let selected = "", page = 0, chart;
    const latestYear = Math.max(...data.records.map(r => r.y));
    let lastMonth = 0;
    data.records.filter(r => r.y === latestYear).forEach(r => r.m.forEach((q, i) => { if (q !== 0) lastMonth = Math.max(lastMonth, i + 1); }));
    document.getElementById("productCoverage").textContent =
      "전체 제품 검색 (때밀이·샤워·행주·등밀이 포함). " + latestYear + "년의 마지막 판매 기록은 " + (lastMonth || "확인 불가") + "월입니다. 이후 월은 미입력일 수 있습니다.";
    for (let month = 12; month >= 1; month--) {
      const option = document.createElement("option");
      option.value = String(month);
      option.textContent = month === 12 ? "연간 전체 (최신 연도는 누계)" : "매년 1~" + month + "월 비교";
      period.append(option);
    }
    const format = value => Math.round(value).toLocaleString("ko-KR");
    function renderDetail() {
      if (!selected) return;
      detail.hidden = false;
      document.getElementById("productSelected").textContent = selected;
      const series = annualSeries(data.records, selected, Number(period.value));
      document.getElementById("productPeriodNote").textContent =
        Number(period.value) === 12
          ? "연간 합계입니다. " + latestYear + "년은 입력된 누계이므로 이전 연도 전체와 직접 비교하지 마세요. 기록 없음은 판매 0과 구분합니다."
          : "모든 연도를 같은 기간인 1~" + period.value + "월로 비교합니다. 최신 연도의 미입력 월이 포함되는지 확인하세요.";
      const body = document.getElementById("productYearBody");
      body.replaceChildren();
      series.slice().reverse().forEach(row => {
        const tr = document.createElement("tr");
        const values = [row.year + "년", row.quantity === null ? "기록 없음" : format(row.quantity) + "개",
          row.quantity === null ? "—" : row.revenue === null ? "가격 미확인" : format(row.revenue) + "원"];
        values.forEach((value, i) => {
          const td = document.createElement("td");
          td.textContent = value;
          if (i) td.className = "num";
          tr.append(td);
        });
        body.append(tr);
      });
      const revenue = metric.value === "revenue";
      if (chart) chart.destroy();
      chart = new root.Chart(document.getElementById("productTrendChart"), {
        type: "line",
        data: { labels: series.map(r => r.year + "년"), datasets: [{
          label: revenue ? "공장도가 기준 추정 금액" : "판매수량",
          data: series.map(r => revenue ? r.revenue : r.quantity),
          borderColor: "#813b50", backgroundColor: "#813b5018", fill: true,
          pointRadius: 3, pointHoverRadius: 5, tension: 0.15, spanGaps: false
        }] },
        options: { responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false }, tooltip: { callbacks: {
            label: ctx => format(ctx.parsed.y) + (revenue ? "원" : "개")
          } } },
          scales: { y: { ticks: { callback: value => format(value) } }, x: { ticks: { maxRotation: 45 } } }
        }
      });
    }
    function search() {
      const names = findProducts(data.records, input.value);
      results.replaceChildren();
      const pages = Math.ceil(names.length / pageSize);
      page = Math.max(0, Math.min(page, pages - 1));
      const start = page * pageSize;
      document.getElementById("productPagination").hidden = pages <= 1;
      previous.disabled = page === 0;
      more.disabled = page >= pages - 1;
      more.hidden = false;
      pageStatus.textContent = pages ? (page + 1) + " / " + pages : "";
      status.textContent = !input.value.trim() ? "제품명을 입력하세요. 예: 뉴컬러무지40, 코마40" :
        names.length ? names.length + "개 제품 · 원하는 상품을 선택하세요" : "일치하는 제품이 없습니다.";
      names.slice(start, start + pageSize).forEach(name => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "product-result";
        button.textContent = name;
        button.setAttribute("aria-pressed", String(name === selected));
        button.addEventListener("click", () => { selected = name; picker.hidden = true; status.textContent = "선택한 상품의 판매 추이를 표시합니다."; renderDetail(); change.focus({ preventScroll: true }); });
        results.append(button);
      });
    }
    input.addEventListener("input", () => {
      page = 0;
      picker.hidden = false;
      selected = "";
      detail.hidden = true;
      if (chart) { chart.destroy(); chart = null; }
      search();
    });
    more.addEventListener("click", () => { page++; search(); results.querySelector("button")?.focus({ preventScroll: true }); });
    previous.addEventListener("click", () => { page--; search(); results.querySelector("button")?.focus({ preventScroll: true }); });
    change.addEventListener("click", () => { picker.hidden = false; search(); results.querySelector("button")?.focus({ preventScroll: true }); });
    period.addEventListener("change", renderDetail);
    metric.addEventListener("change", renderDetail);
    search();
  }
  root.SalesProductExplorer = { findProducts, annualSeries, mount };
})(globalThis);