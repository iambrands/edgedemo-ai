import{j as e}from"./query-vendor-73c8cntc.js";import{u as Y,r as d}from"./react-vendor-WhINBsan.js";import{C as U}from"./Card-BPUyRHs1.js";import{B as S}from"./Badge-BRUA1Mzi.js";import{B as y}from"./Button-D-q74hAY.js";import{P as Z}from"./PageHeader-Drh0rtI8.js";import{b as ee,p as _}from"./index-CGEyVa4K.js";import{e as te}from"./export-CIATll90.js";import{R as f,aG as se,B as L,ad as ae,aR as I,w as E,D as re,d as le,c as ie,a7 as ne,e as ce,a4 as oe,f as de,aB as me,ag as xe}from"./icons-BGu4IMJj.js";import"./charts-0tdbZu--.js";const m=x=>new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:0}).format(x),N=x=>new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",minimumFractionDigits:2,maximumFractionDigits:2}).format(x);function ke(){const x=Y(),Q=ee(),[k,B]=d.useState([]),[z,$]=d.useState(!0),[C,D]=d.useState(null),[p,V]=d.useState({}),[u,R]=d.useState(!1),[b,G]=d.useState(""),[v,H]=d.useState("value"),[j,q]=d.useState("desc");d.useEffect(()=>{M()},[]);const M=async()=>{$(!0);try{const t=await _.listSaved();B(t.portfolios||[])}catch(t){console.error("Failed to load portfolios:",t),Q.error("Failed to load saved portfolios")}finally{$(!1)}},w=d.useCallback(async t=>{const r=(t.holdings||[]).map(s=>s.symbol).filter(s=>s&&s!=="Cash"&&!s.includes(" "));if(r.length!==0){R(!0);try{const s=await _.getQuotes(r,t.id);V(s.quotes||{}),G(s.source||"mock")}catch(s){console.error("Failed to load quotes:",s)}finally{R(!1)}}},[]),O=t=>{C===t.id?(D(null),V({})):(D(t.id),w(t))},P=t=>{const r=p[t.symbol];if(!r)return null;const s=r.price*t.quantity,i=t.marketValue,n=s-i,a=i>0?n/i*100:0;return{currentPrice:r.price,currentValue:s,performanceDollar:n,performancePct:a,quote:r}},F=t=>{if(Object.keys(p).length===0)return null;let r=0,s=0;for(const a of t.holdings||[]){const c=p[a.symbol];c?(r+=c.price*a.quantity,s+=a.marketValue):(r+=a.marketValue,s+=a.marketValue)}const i=r-s,n=s>0?i/s*100:0;return{currentTotal:r,changeDollar:i,changePct:n}},W=t=>{v===t?q(r=>r==="asc"?"desc":"asc"):(H(t),q(t==="symbol"||t==="description"||t==="type"?"asc":"desc"))},J=d.useCallback(t=>[...t].sort((s,i)=>{const n=P(s),a=P(i);let c=0,l=0;switch(v){case"symbol":c=s.symbol||"",l=i.symbol||"";break;case"description":c=s.description||"",l=i.description||"";break;case"qty":c=s.quantity||0,l=i.quantity||0;break;case"upload":c=s.price||0,l=i.price||0;break;case"current":c=(n==null?void 0:n.currentPrice)??s.price??0,l=(a==null?void 0:a.currentPrice)??i.price??0;break;case"value":c=(n==null?void 0:n.currentValue)??s.marketValue??0,l=(a==null?void 0:a.currentValue)??i.marketValue??0;break;case"change":c=(n==null?void 0:n.performancePct)??0,l=(a==null?void 0:a.performancePct)??0;break;case"type":c=s.securityType||"",l=i.securityType||"";break;default:c=s.marketValue||0,l=i.marketValue||0}if(typeof c=="string"){const h=c.localeCompare(l);return j==="asc"?h:-h}return j==="asc"?c-l:l-c}),[v,j,p]),K=t=>{const r=t.analysis;if(!r)return;const s=t.client_name||"Client",i=t.advisor_name||"Advisor",n=new Date().toLocaleDateString("en-US",{year:"numeric",month:"long",day:"numeric"}),a=F(t),c=(t.holdings||[]).sort((o,g)=>g.marketValue-o.marketValue).map(o=>{const g=p[o.symbol],X=g?g.price:o.price,T=g?g.price*o.quantity:o.marketValue,A=T-o.marketValue;return`<tr>
          <td><strong>${o.symbol}</strong></td>
          <td>${o.description}</td>
          <td style="text-align:right">${o.quantity.toLocaleString()}</td>
          <td style="text-align:right">${N(o.price)}</td>
          <td style="text-align:right">${N(X)}</td>
          <td style="text-align:right">${m(T)}</td>
          <td style="text-align:right" class="${A>=0?"gain":"loss"}">${m(A)}</td>
        </tr>`}).join(""),l=r.riskScore<=35?"low":r.riskScore<=65?"moderate":"high",h=`
      <div class="report-header">
        <div class="logo-row">
          <div class="logo-mark">E</div>
          <div class="logo-text">Firmum</div>
        </div>
        <h1>Portfolio Performance Report</h1>
        <div class="subtitle">Current Holdings & Live Market Performance</div>
        <div class="meta-row">
          <span><strong>Client:</strong> ${s}</span>
          <span><strong>Advisor:</strong> ${i}</span>
          <span><strong>Date:</strong> ${n}</span>
        </div>
      </div>

      <div class="metrics-bar">
        <div class="metric">
          <div class="metric-value">${m(t.total_value)}</div>
          <div class="metric-label">Original Value</div>
        </div>
        <div class="metric">
          <div class="metric-value">${a?m(a.currentTotal):"N/A"}</div>
          <div class="metric-label">Current Value</div>
        </div>
        <div class="metric">
          <div class="metric-value" style="color:${a&&a.changeDollar>=0?"#16a34a":"#dc2626"}">
            ${a?`${a.changeDollar>=0?"+":""}${a.changePct.toFixed(1)}%`:"N/A"}
          </div>
          <div class="metric-label">Performance</div>
        </div>
        <div class="metric">
          <div class="metric-value"><span class="risk-badge risk-${l}">${r.riskScore}</span></div>
          <div class="metric-label">Risk Score</div>
        </div>
      </div>

      <h2>Executive Summary</h2>
      <div class="info-box"><p>${r.executiveSummary}</p></div>

      <h2>Current Holdings & Performance</h2>
      <table>
        <thead><tr>
          <th>Symbol</th><th>Description</th><th style="text-align:right">Qty</th>
          <th style="text-align:right">Upload Price</th><th style="text-align:right">Current Price</th>
          <th style="text-align:right">Current Value</th><th style="text-align:right">Change</th>
        </tr></thead>
        <tbody>${c}</tbody>
      </table>

      <h2>AI Recommendations</h2>
      <table>
        <thead><tr><th>Priority</th><th>Action</th><th>Ticker</th><th>Rationale</th></tr></thead>
        <tbody>${(r.recommendations||[]).map(o=>`
          <tr>
            <td class="severity-${o.priority==="medium"?"moderate":o.priority}">${o.priority.toUpperCase()}</td>
            <td><strong>${o.action}</strong></td>
            <td>${o.ticker}</td>
            <td>${o.rationale}</td>
          </tr>
        `).join("")}</tbody>
      </table>

      <div class="report-footer">
        <p class="brand">Firmum &mdash; AI-Powered Wealth Management Platform</p>
        <p>IAB Advisors, Inc. &bull; Report generated ${n}</p>
        <p>Market data source: ${b==="alpha_vantage"?"Alpha Vantage":"Simulated"} &bull; Confidential</p>
      </div>

      <div class="disclosures">
        <h3 style="font-size:8pt; color:#9ca3af; margin-bottom:6px;">IMPORTANT DISCLOSURES</h3>
        <p>This report is for informational purposes only and does not constitute investment advice.
        Past performance is not indicative of future results. All investments carry risk.</p>
      </div>
    `;te("Portfolio Performance Report",h,`portfolio-${s.replace(/\s+/g,"-").toLowerCase()}`)};return z?e.jsx("div",{className:"flex items-center justify-center h-64",children:e.jsx(f,{className:"w-8 h-8 text-blue-500 animate-spin"})}):e.jsxs("div",{className:"space-y-6",children:[e.jsx(Z,{title:"Client Portfolios",subtitle:"View saved portfolios with live performance data",badge:e.jsxs(S,{variant:"blue",children:[k.length," portfolios"]}),actions:e.jsxs(y,{variant:"primary",onClick:()=>x("/dashboard/portfolio-review"),children:[e.jsx(se,{className:"w-4 h-4 mr-1"}),"New Portfolio Review"]})}),k.length===0?e.jsx(U,{children:e.jsxs("div",{className:"text-center py-16",children:[e.jsx("div",{className:"w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4",children:e.jsx(L,{className:"w-8 h-8 text-slate-400"})}),e.jsx("h3",{className:"text-lg font-semibold text-slate-900 mb-2",children:"No saved portfolios yet"}),e.jsx("p",{className:"text-slate-500 mb-6 max-w-md mx-auto",children:"Upload a portfolio CSV in Portfolio Review, run AI analysis, and the portfolio will be automatically saved here with live performance tracking."}),e.jsxs(y,{variant:"primary",onClick:()=>x("/dashboard/portfolio-review"),children:[e.jsx(ae,{className:"w-4 h-4 mr-1"}),"Go to Portfolio Review"]})]})}):e.jsx("div",{className:"space-y-4",children:k.map(t=>{var i,n;const r=C===t.id,s=r?F(t):null;return e.jsxs(U,{children:[e.jsxs("button",{onClick:()=>O(t),className:"w-full flex items-center justify-between p-1 text-left",children:[e.jsxs("div",{className:"flex items-center gap-4",children:[e.jsx("div",{className:"w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center",children:e.jsx(L,{className:"w-5 h-5 text-blue-600"})}),e.jsxs("div",{children:[e.jsx("h3",{className:"text-base font-semibold text-slate-900",children:t.client_name}),e.jsxs("p",{className:"text-sm text-slate-500",children:[t.holdings_count," holdings · ",m(t.total_value)," ·"," ",new Date(t.created_at).toLocaleDateString()]})]})]}),e.jsxs("div",{className:"flex items-center gap-4",children:[((i=t.analysis)==null?void 0:i.riskScore)!=null&&e.jsxs("div",{className:"text-right hidden sm:block",children:[e.jsx("div",{className:"text-xs text-slate-500",children:"Risk Score"}),e.jsxs(S,{variant:t.analysis.riskScore<=35?"green":t.analysis.riskScore<=65?"amber":"red",children:[t.analysis.riskScore,"/100"]})]}),e.jsxs("div",{className:"text-right hidden sm:block",children:[e.jsx("div",{className:"text-xs text-slate-500",children:"Gain/Loss"}),e.jsx("span",{className:`text-sm font-semibold ${t.total_gain>=0?"text-emerald-600":"text-red-600"}`,children:m(t.total_gain)})]}),r?e.jsx(I,{className:"w-5 h-5 text-slate-400"}):e.jsx(E,{className:"w-5 h-5 text-slate-400"})]})]}),r&&e.jsxs("div",{className:"mt-4 border-t border-slate-100 pt-4 space-y-6",children:[(s||u)&&e.jsxs("div",{className:"grid grid-cols-2 sm:grid-cols-4 gap-4",children:[e.jsxs("div",{className:"bg-slate-50 rounded-lg p-4 text-center",children:[e.jsx(re,{className:"w-5 h-5 text-blue-600 mx-auto mb-1"}),e.jsx("div",{className:"text-lg font-bold text-slate-900",children:m(t.total_value)}),e.jsx("div",{className:"text-xs text-slate-500",children:"Upload Value"})]}),e.jsxs("div",{className:"bg-slate-50 rounded-lg p-4 text-center",children:[e.jsx(le,{className:"w-5 h-5 text-blue-600 mx-auto mb-1"}),e.jsx("div",{className:"text-lg font-bold text-slate-900",children:u?e.jsx(f,{className:"w-5 h-5 animate-spin mx-auto"}):s?m(s.currentTotal):"—"}),e.jsx("div",{className:"text-xs text-slate-500",children:"Current Value"})]}),e.jsxs("div",{className:"bg-slate-50 rounded-lg p-4 text-center",children:[s&&s.changeDollar>=0?e.jsx(ie,{className:"w-5 h-5 text-emerald-600 mx-auto mb-1"}):e.jsx(ne,{className:"w-5 h-5 text-red-600 mx-auto mb-1"}),e.jsx("div",{className:`text-lg font-bold ${s&&s.changeDollar>=0?"text-emerald-600":"text-red-600"}`,children:u?"...":s?`${s.changeDollar>=0?"+":""}${s.changePct.toFixed(2)}%`:"—"}),e.jsx("div",{className:"text-xs text-slate-500",children:"Performance"})]}),e.jsxs("div",{className:"bg-slate-50 rounded-lg p-4 text-center",children:[e.jsx(ce,{className:"w-5 h-5 text-blue-600 mx-auto mb-1"}),e.jsx("div",{className:"text-lg font-bold text-slate-900",children:t.holdings_count}),e.jsx("div",{className:"text-xs text-slate-500",children:"Positions"})]})]}),b&&!u&&e.jsxs("div",{className:"flex items-center gap-2 text-xs text-slate-400",children:[e.jsx("span",{className:`w-2 h-2 rounded-full ${b==="alpha_vantage"?"bg-emerald-400":"bg-amber-400"}`}),b==="alpha_vantage"?"Live quotes from Alpha Vantage":"Simulated market data",e.jsx("button",{onClick:()=>w(t),className:"ml-2 text-blue-500 hover:text-blue-700","aria-label":"Refresh quotes",children:e.jsx(f,{className:"w-3 h-3"})})]}),((n=t.analysis)==null?void 0:n.executiveSummary)&&e.jsxs("div",{className:"bg-blue-50 border-l-4 border-blue-500 rounded-r-lg p-4",children:[e.jsxs("div",{className:"flex items-center gap-2 mb-1",children:[e.jsx(oe,{className:"w-4 h-4 text-blue-600"}),e.jsx("span",{className:"text-sm font-semibold text-blue-800",children:"AI Analysis Summary"})]}),e.jsx("p",{className:"text-sm text-blue-700",children:t.analysis.executiveSummary})]}),e.jsx("div",{className:"overflow-x-auto",children:e.jsxs("table",{className:"w-full text-sm",children:[e.jsx("thead",{children:e.jsx("tr",{className:"bg-slate-50 text-left",children:[{key:"symbol",label:"Symbol",align:"left"},{key:"description",label:"Description",align:"left"},{key:"qty",label:"Qty",align:"right"},{key:"upload",label:"Upload Price",align:"right"},{key:"current",label:"Current",align:"right"},{key:"value",label:"Value",align:"right"},{key:"change",label:"Change",align:"right"},{key:"type",label:"Type",align:"left"}].map(a=>e.jsx("th",{className:`px-3 py-2.5 font-semibold text-xs uppercase tracking-wide cursor-pointer select-none hover:text-blue-600 transition-colors ${a.align==="right"?"text-right":""} ${v===a.key?"text-blue-600":"text-slate-600"}`,onClick:()=>W(a.key),children:e.jsxs("span",{className:"inline-flex items-center gap-1",children:[a.label,v===a.key?j==="asc"?e.jsx(I,{className:"w-3 h-3"}):e.jsx(E,{className:"w-3 h-3"}):e.jsx(de,{className:"w-3 h-3 opacity-30"})]})},a.key))})}),e.jsx("tbody",{children:J(t.holdings||[]).map((a,c)=>{var h;const l=P(a);return e.jsxs("tr",{className:"border-t border-slate-100 hover:bg-slate-50",children:[e.jsx("td",{className:"px-3 py-2.5 font-semibold text-slate-900",children:a.symbol}),e.jsx("td",{className:"px-3 py-2.5 text-slate-600 max-w-[200px] truncate",children:a.description}),e.jsx("td",{className:"px-3 py-2.5 text-right text-slate-700",children:(h=a.quantity)==null?void 0:h.toLocaleString()}),e.jsx("td",{className:"px-3 py-2.5 text-right text-slate-700",children:N(a.price)}),e.jsx("td",{className:"px-3 py-2.5 text-right font-medium",children:u?e.jsx("span",{className:"text-slate-400",children:"..."}):l?N(l.currentPrice):e.jsx("span",{className:"text-slate-400",children:"—"})}),e.jsx("td",{className:"px-3 py-2.5 text-right font-medium text-slate-900",children:m(l?l.currentValue:a.marketValue)}),e.jsx("td",{className:"px-3 py-2.5 text-right",children:l?e.jsxs("span",{className:`font-semibold ${l.performanceDollar>=0?"text-emerald-600":"text-red-600"}`,children:[l.performanceDollar>=0?"+":"",l.performancePct.toFixed(1),"%"]}):e.jsx("span",{className:"text-slate-400",children:"—"})}),e.jsx("td",{className:"px-3 py-2.5",children:e.jsx(S,{variant:"gray",className:"text-xs",children:a.securityType})})]},`${a.symbol}-${c}`)})})]})}),e.jsxs("div",{className:"flex items-center gap-3 pt-2",children:[e.jsxs(y,{variant:"primary",size:"sm",onClick:()=>K(t),children:[e.jsx(me,{className:"w-4 h-4 mr-1"}),"Generate PDF Report"]}),e.jsxs(y,{variant:"secondary",size:"sm",onClick:()=>x("/dashboard/prospects"),children:[e.jsx(xe,{className:"w-4 h-4 mr-1"}),"View Prospect"]}),e.jsxs(y,{variant:"secondary",size:"sm",onClick:()=>w(t),disabled:u,children:[e.jsx(f,{className:`w-4 h-4 mr-1 ${u?"animate-spin":""}`}),"Refresh Quotes"]})]})]})]},t.id)})})]})}export{ke as ClientPortfolios};
