let stage=0;
const stages=[...document.querySelectorAll('.stage')];
const status=document.getElementById('loanStatus');
const advance=document.getElementById('advance');
const groftyStatus=document.getElementById('groftyStatus');
const groftyPanel=document.getElementById('groftyPanel');
function render(){stages.forEach((s,i)=>s.classList.toggle('active',i===stage));const names=['Proposed','Accepted','Collateral Locked','Funded','Active','Liquidated'];status.textContent=names[stage]||'Proposed';advance.innerHTML=stage===5?'Reset Position <span>↻</span>':stage>=4?'Repay Loan <span>✓</span>':'Approve Loan <span>✓</span>';}
stages.forEach((s,i)=>s.addEventListener('click',()=>{stage=i;render()}));
document.getElementById('connect').addEventListener('click',()=>{groftyStatus.textContent='Connected';groftyStatus.style.color='#19d6bd';groftyPanel.textContent='Connected · Ready for borrower transactions';document.getElementById('connect').textContent='Connected';});
document.getElementById('testConnection').addEventListener('click',()=>alert('Grofty connection test: ready.'));
advance.addEventListener('click',()=>{stage=stage<5?stage+1:0;render()});
document.getElementById('approveFund').addEventListener('click',()=>{stage=3;render();alert('Demo: lender funding approved and disbursement queued.');});
document.getElementById('liquidate').addEventListener('click',()=>{stage=5;render();alert('Demo: liquidation workflow triggered.');});
document.getElementById('cancel').addEventListener('click',()=>{stage=0;render()});
document.getElementById('reset').addEventListener('click',()=>{stage=0;groftyStatus.textContent='Not connected';groftyPanel.textContent='Not connected';render()});
render();