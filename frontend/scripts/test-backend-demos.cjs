/* Functional interaction checks for the four original browser demos.
   Run with node; uses workspace jsdom or an installed jsdom dependency. */
const fs = require('fs');
const path = require('path');
const assert = require('assert/strict');
let JSDOM, VirtualConsole;
try { ({JSDOM, VirtualConsole} = require('jsdom')); }
catch { throw new Error('These checks require jsdom. Install jsdom in your test environment, then run this script again.'); }
const root = path.resolve(__dirname, '../public/demos');
let checks = 0;
const check = (value, message) => { assert(value, message); checks++; };
function load(slug) {
  const errors = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', err => { if (!err.message.includes('navigation')) errors.push(err.message); });
  const dom = new JSDOM(fs.readFileSync(path.join(root, slug + '.html'), 'utf8'), {
    url: 'https://demo.example.test/demos/' + slug + '.html', runScripts:'dangerously', virtualConsole,
    beforeParse(window) { window.structuredClone = structuredClone; window.HTMLAnchorElement.prototype.click = function() { window.downloaded = {filename:this.download, href:this.href}; }; }
  });
  const d = dom.window.document;
  const input = (selector, value, type='input') => { const el = d.querySelector(selector); check(!!el,selector+' exists'); el.value=value; el.dispatchEvent(new dom.window.Event(type,{bubbles:true})); };
  const click = selector => { const el=d.querySelector(selector); check(!!el,selector+' exists'); el.click(); };
  const submit = selector => { const el=d.querySelector(selector); check(!!el,selector+' exists'); el.dispatchEvent(new dom.window.Event('submit',{bubbles:true,cancelable:true})); };
  check(d.querySelector('header').textContent.includes('Interactive Demo'),'Explicit demo label');
  check(d.querySelector('meta[name=robots]').content==='noindex,follow','Demo pages noindex');
  check(!errors.length,slug+': no script errors '+errors.join(';'));
  return {dom,d,input,click,submit,errors};
}
{
 const x=load('dispatch-logistics');
 check(x.d.querySelectorAll('#rows tr').length===4,'Initial shipment rows');
 x.input('#customer','Test logistics');x.input('#route','Delhi → Pune');x.submit('#create');
 check(x.d.querySelector('#rows').textContent.includes('Test logistics'),'New shipment appears');
 x.input('[data-driver="DSP-1045"]','Meera Shah','change');
 check(x.d.querySelector('[data-next="DSP-1045"]').closest('tr').textContent.includes('Assigned'),'Driver assignment sets status');
 x.click('[data-next="DSP-1045"]');
 check(x.d.querySelector('[data-next="DSP-1045"]').closest('tr').textContent.includes('In transit'),'Advance to in transit');
 x.click('[data-next="DSP-1045"]');
 check(x.d.querySelector('#rows').textContent.includes('Test logistics'),'Delivered shipment retained');
 x.input('#status','Delivered','change');check(x.d.querySelectorAll('#rows tr').length===2,'Status filter');
 x.input('#search','Test logistics');check(x.d.querySelectorAll('#rows tr').length===1,'Search plus status');
 check(x.dom.window.localStorage.getItem('demo-dispatch-v1').includes('Test logistics'),'Persisted locally');
 x.click('#reset');check(x.d.querySelectorAll('#rows tr').length===4,'Reset sample data');
 check(!x.errors.length,'No dispatch interaction errors');
}
{
 const x=load('factory-work-orders');
 x.input('#product','Test component');x.input('#quantity','150');x.submit('#create');
 check(x.d.querySelector('#rows').textContent.includes('Test component'),'New work order appears');
 x.click('[data-next="WO-2404"]');
 check(x.d.querySelector('[data-next="WO-2404"]').closest('tr').textContent.includes('33%'),'Production progress advances');
 x.click('[data-next="WO-2404"]');x.click('[data-next="WO-2404"]');
 check(!x.d.querySelector('[data-next="WO-2404"]'),'Completed order cannot advance further');
 x.input('#status','Complete','change');check(x.d.querySelectorAll('#rows tr').length===2,'Production stage filter');
 x.input('#material','Fastener kits','change');x.input('#delta','30');x.submit('#adjust');
 check(x.d.querySelector('#stock').textContent.includes('54 units'),'Material balance adjusted');
 x.input('#delta','-500');x.submit('#adjust');
 check(x.d.querySelector('#toast').textContent.includes('cannot be below zero'),'Negative stock rejected');
 check(x.d.querySelector('#stock').textContent.includes('54 units'),'Rejected stock leaves balance unchanged');
 x.click('#reset');check(x.d.querySelectorAll('#rows tr').length===4,'Production reset');
 check(!x.errors.length,'No factory interaction errors');
}
{
 const x=load('buildcost-estimator');
 check(x.d.querySelector('#subtotal').textContent.includes('2,96,550'),'Initial subtotal exact');
 check(x.d.querySelector('#total').textContent.includes('3,49,929'),'Initial tax total exact');
 x.input('[data-id="1"][data-field="qty"]','2');
 check(x.d.querySelector('#subtotal').textContent.includes('1,96,250'),'Quantity recalculates subtotal');
 x.input('#tax','10');
 check(x.d.querySelector('#taxamount').textContent.includes('19,625'),'Tax recalculates');
 x.click('#add');check(x.d.querySelectorAll('#rows tr').length===5,'Add line item');
 x.click('[data-delete="4"]');check(x.d.querySelectorAll('#rows tr').length===4,'Remove line item');
 x.input('#client','Test client');x.click('#export');
 check(x.dom.window.lastExport.includes('Test client'),'Export includes current client');
 check(x.dom.window.lastExport.includes('Tax (10%)'),'Export includes tax rate');
 check(x.dom.window.downloaded.filename==='buildcost-sample-quote.txt','Download filename');
 check(decodeURIComponent(x.dom.window.downloaded.href).includes('Test client'),'Download content');
 x.click('#reset');check(x.d.querySelector('#total').textContent.includes('3,49,929'),'Quote reset');
 check(!x.errors.length,'No quote interaction errors');
}
{
 const x=load('supportdesk-helpdesk');
 check(x.d.querySelectorAll('[data-ticket]').length===4,'Initial ticket count');
 x.input('#search','Oliver');check(x.d.querySelectorAll('[data-ticket]').length===1,'Ticket customer search');
 x.click('[data-ticket="TKT-1081"]');
 x.input('#reply','Please select a custom date range in the export panel.');x.submit('#replyform');
 check(x.d.querySelector('.thread').textContent.includes('Please select a custom date range'),'Reply shown in thread');
 check(x.d.querySelector('#ticketstatus').value==='Waiting on customer','Reply changes waiting status');
 x.input('#ticketstatus','Resolved','change');check(x.d.querySelector('#ticketstatus').value==='Resolved','Resolve ticket');
 x.input('#ticketpriority','Low','change');check(x.d.querySelector('#ticketpriority').value==='Low','Update priority');
 x.input('#search','');x.input('#priority','High','change');check(x.d.querySelectorAll('[data-ticket]').length===0,'Priority filter after update');
 x.input('#priority','','change');x.input('#customer','Test customer');x.input('#subject','Test ticket');x.input('#message','A sample request');x.submit('#create');
 check(x.d.querySelector('#detail').textContent.includes('Test ticket'),'New ticket selected');
 check(x.d.querySelectorAll('[data-ticket]').length===5,'New ticket in inbox');
 check(x.dom.window.localStorage.getItem('demo-supportdesk-v1').includes('Test customer'),'Ticket saved locally');
 x.click('#reset');check(x.d.querySelectorAll('[data-ticket]').length===4,'Support reset');
 check(!x.errors.length,'No support interaction errors');
}
console.log(JSON.stringify({status:'passed',demos:4,checks},null,2));
