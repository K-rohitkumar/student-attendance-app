(function(){
    'use strict';
    const KEY='classmate_attendance_data_v2';let state=load();let toastTimer;
    const $=id=>document.getElementById(id);
    const today=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
    function uid(){return 'id'+Date.now().toString(36)+Math.random().toString(36).slice(2,8)}
    function load(){
      try{
        const s=JSON.parse(localStorage.getItem(KEY));
        if(s&&Array.isArray(s.batches)&&s.records) return s;
      }catch(e){}
      return {batches:[],records:{},holidays:{},workshops:[]};
    }
    function save(){
      try{
        localStorage.setItem(KEY,JSON.stringify(state));
        $('saveStatus').textContent='Saved on this device';
      }catch(e){
        $('saveStatus').textContent='Storage full';
        notify('Could not save. Download a backup and free device storage.');
      }
    }
    function notify(msg){const t=$('toast');t.textContent=msg;t.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove('show'),2600)}
    function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
    function activeBatch(){return state.batches.find(b=>b.id===$('attendanceBatch').value)||state.batches[0]}
    
    // Key resolver for regular vs extra sessions
    function recordKey(date, slot){
      return slot === 'extra' ? `${date}_extra` : date;
    }
    
    function record(date, slot){
      const rKey = recordKey(date, slot);
      if(!state.records[rKey]) state.records[rKey]={};
      return state.records[rKey];
    }
    function statusOf(student, date, slot){
      const r = record(date, slot);
      return r[student.id]==true;
    }
    function setStatus(student, date, slot, present){
      record(date, slot)[student.id]=present;
      save();
      renderAttendance();
      renderHistory();
    }
    function attendanceDates(){return Object.keys(state.records).filter(k=>!k.endsWith('_extra')).sort()}
    function fmtDate(date){if(!date)return '';const [y,m,d]=date.split('-');return `${d}/${m}/${y}`}
    function optionsHTML(selected){return state.batches.map(b=>`<option value="${esc(b.id)}" ${b.id===selected?'selected':''}>${esc(b.name)}</option>`).join('')}
    
    function fillSelects(){
      const ids=['attendanceBatch','studentBatch','exportBatch','historyBatch','workshopSourceBatch','weeklyReportBatch'];
      ids.forEach(id=>{
        const el=$(id);
        if(!el) return;
        const old=el.value;
        el.innerHTML=optionsHTML(old)||'<option value="">No batches yet</option>';
        if(state.batches.some(b=>b.id===old)) el.value=old;
        else if(state.batches[0]) el.value=state.batches[0].id;
        el.disabled=!state.batches.length;
      });
    }
    
    function isSunday(dateStr){
      if(!dateStr) return false;
      const parts = dateStr.split('-');
      const d = new Date(parts[0], parts[1]-1, parts[2]);
      return d.getDay() === 0;
    }
    
    function renderAttendance(){
      const b=activeBatch();
      const date=$('attendanceDate').value||today();
      const slot=$('sessionSlotSelect').value;
      const list=$('attendanceList');
      
      // Handle Sunday & Holidays
      const holidayObj = state.holidays[date];
      const isSun = isSunday(date);
      const overrideKey = `${date}_override`;
      const isOverridden = state.records[overrideKey] === true;
    
      if (holidayObj) {
        $('dayStatusBanner').style.display='none';
        $('holidayActiveNotice').style.display='block';
        $('holidayPurposeDisplay').textContent = `Holiday Purpose: ${holidayObj.purpose || 'General Holiday'}`;
        list.innerHTML='<div class="empty">Marked as Holiday. No attendance taken.</div>';
        ['totalCount','presentCount','absentCount'].forEach(id=>$(id).textContent='0');
        return;
      } else {
        $('holidayActiveNotice').style.display='none';
      }
    
      if (isSun && !isOverridden && slot === 'regular') {
        $('dayStatusBanner').style.display='block';
        list.innerHTML='<div class="empty">This date is a Sunday. Attendance is paused by default.</div>';
        ['totalCount','presentCount','absentCount'].forEach(id=>$(id).textContent='0');
        return;
      } else {
        $('dayStatusBanner').style.display='none';
      }
    
      if(!b){
        list.innerHTML='<div class="empty">No batches yet. Open <b>Batches & students</b> to create a batch and add students.</div>';
        ['totalCount','presentCount','absentCount'].forEach(id=>$(id).textContent='0');
        return;
      }
    
      const students=b.students||[];
      let present=0;
      students.forEach(s=>{if(statusOf(s,date,slot))present++});
      $('totalCount').textContent=students.length;
      $('presentCount').textContent=present;
      $('absentCount').textContent=students.length-present;
    
      if(!students.length){
        list.innerHTML='<div class="empty">This batch has no students yet.<br>Open <b>Batches & students</b> to add them.</div>';
        return;
      }
    
      list.innerHTML=students.map(s=>{
        const p=statusOf(s,date,slot);
        return `<div class="student-row"><div class="avatar">${esc((s.name.trim()[0]||'?').toUpperCase())}</div><div class="student-info"><div class="student-name">${esc(s.name)}</div><div class="student-roll">${s.roll?`Roll No. ${esc(s.roll)}`:'No roll number'}</div></div><button class="toggle ${p?'present':'absent'}" data-toggle="${esc(s.id)}" aria-label="Toggle attendance for ${esc(s.name)}">${p?'✓ Present':'✕ Absent'}</button></div>`;
      }).join('');
    
      list.querySelectorAll('[data-toggle]').forEach(btn=>btn.addEventListener('click',()=>{
        const s=students.find(x=>x.id===btn.dataset.toggle);
        if(s) setStatus(s, date, slot, !statusOf(s, date, slot));
      }));
    }
    
    function renderBatches(){
      const wrap=$('batchManager');
      if(!state.batches.length){wrap.innerHTML='<div class="empty">No batches created yet. Add your first batch above.</div>';return}
      wrap.innerHTML=state.batches.map(b=>`<div class="batch-card"><div class="batch-top"><div class="batch-title">${esc(b.name)}</div><div class="batch-count">${b.students.length} student${b.students.length===1?'':'s'}</div></div><div class="batch-actions"><button class="mini-btn" data-rename="${esc(b.id)}">Rename batch</button><button class="mini-btn" data-add="${esc(b.id)}">Add students</button><button class="mini-btn danger" data-delete="${esc(b.id)}">Delete batch</button></div><div class="divider"></div>${b.students.length?b.students.map(s=>`<div class="batch-top" style="padding:5px 0"><div class="student-info"><div class="student-name">${esc(s.name)}</div><div class="student-roll">${s.roll?`Roll No. ${esc(s.roll)}`:'No roll number'}</div></div><button class="mini-btn" data-editstudent="${esc(b.id)}|${esc(s.id)}">Edit</button><button class="mini-btn danger" data-remstudent="${esc(b.id)}|${esc(s.id)}">Remove</button></div>`).join(''):'<p class="muted small">No students in this batch.</p>'}</div>`).join('');
      
      wrap.querySelectorAll('[data-rename]').forEach(btn=>btn.onclick=()=>{const b=state.batches.find(x=>x.id===btn.dataset.rename);const n=prompt('New batch name:',b.name);if(n&&n.trim()){b.name=n.trim();save();refresh();notify('Batch renamed')}});
      wrap.querySelectorAll('[data-add]').forEach(btn=>btn.onclick=()=>{$('studentBatch').value=btn.dataset.add;$('newStudentName').focus();window.scrollTo({top:0,behavior:'smooth'})});
      wrap.querySelectorAll('[data-delete]').forEach(btn=>btn.onclick=()=>{const b=state.batches.find(x=>x.id===btn.dataset.delete);if(confirm(`Delete batch “${b.name}” and its student roster?`)){state.batches=state.batches.filter(x=>x.id!==b.id);save();refresh();notify('Batch deleted')}});
      wrap.querySelectorAll('[data-remstudent]').forEach(btn=>btn.onclick=()=>{const [bid,sid]=btn.dataset.remstudent.split('|'),b=state.batches.find(x=>x.id===bid);if(confirm(`Remove student?`)){b.students=b.students.filter(x=>x.id!==sid);save();refresh();notify('Student removed')}});
      wrap.querySelectorAll('[data-editstudent]').forEach(btn=>btn.onclick=()=>{const [bid,sid]=btn.dataset.editstudent.split('|'),b=state.batches.find(x=>x.id===bid),s=b.students.find(x=>x.id===sid);const name=prompt('Student name:',s.name);if(name===null||!name.trim())return;const roll=prompt('Roll number (optional):',s.roll||'');if(roll===null)return;s.name=name.trim();s.roll=roll.trim();save();refresh();notify('Student updated')});
    }
    
    function renderHistory(){
      const b=state.batches.find(x=>x.id===$('historyBatch').value);
      const wrap=$('historySummary');
      if(!wrap) return;
      if(!b){wrap.textContent='Create a batch to view history.';return}
      const dates=attendanceDates().filter(d=>b.students.some(s=>Object.prototype.hasOwnProperty.call(state.records[d]||{},s.id)));
      if(!dates.length){wrap.textContent='No attendance records yet for this batch.';return}
      wrap.innerHTML=dates.slice().reverse().map(d=>{
        const p=b.students.filter(s=>statusOf(s,d,'regular')).length;
        const isHol = state.holidays[d] ? ` [Holiday: ${state.holidays[d].purpose}]` : '';
        return `<div><strong>${esc(fmtDate(d))}</strong>${esc(isHol)} — Present: ${p}, Absent: ${b.students.length-p}</div>`;
      }).join('');
    }
    
    function refresh(){
      fillSelects();
      renderAttendance();
      renderBatches();
      renderHistory();
      renderWorkshop();
    }
    
    function absentStudents(b,date,slot='regular'){return (b?.students||[]).filter(s=>!statusOf(s,date,slot))}
    function absentText(b,date,slot='regular'){
      const absent=absentStudents(b,date,slot);
      return `ABSENT STUDENTS\nBatch: ${b?.name||'No batch'}\nDate: ${fmtDate(date)}${slot==='extra'?' (Extra Class)':''}\nTotal absent: ${absent.length}\n\n${absent.length?absent.map((s,i)=>`${i+1}. ${s.roll?`Roll No. ${s.roll} - `:''}${s.name}`).join('\n'):'No absent students.'}`;
    }
    async function copyText(text){
      try{await navigator.clipboard.writeText(text);notify('Copied to clipboard.')}
      catch(e){prompt('Copy this report:',text)}
    }
    
    // Excel export utility helpers
    function xmlEscape(s){return String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;')}
    function colName(n){let out='';while(n>0){let r=(n-1)%26;out=String.fromCharCode(65+r)+out;n=Math.floor((n-1)/26)}return out}
    function worksheetXml(rows){let maxCols=Math.max(1,...rows.map(r=>r.length));const body=rows.map((row,ri)=>'<row r="'+(ri+1)+'">'+row.map((v,ci)=>{const ref=colName(ci+1)+(ri+1);if(typeof v==='number'&&Number.isFinite(v))return `<c r="${ref}"><v>${v}</v></c>`;return `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${xmlEscape(v??'')}</t></is></c>`}).join('')+'</row>').join('');return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><dimension ref="A1:${colName(maxCols)}${Math.max(1,rows.length)}"/><sheetViews><sheetView workbookViewId="0"/></sheetViews><sheetFormatPr defaultRowHeight="18"/><sheetData>${body}</sheetData><autoFilter ref="A1:${colName(maxCols)}${Math.max(1,rows.length)}"/></worksheet>`}
    function crc32(bytes){let c=~0;for(let i=0;i<bytes.length;i++){c^=bytes[i];for(let k=0;k<8;k++)c=(c>>>1)^((c&1)?0xEDB88320:0)}return (~c)>>>0}
    function u16(n){return [n&255,(n>>>8)&255]}function u32(n){return [n&255,(n>>>8)&255,(n>>>16)&255,(n>>>24)&255]}
    function zipStore(files){const enc=new TextEncoder(),parts=[],central=[];let offset=0;for(const f of files){const name=enc.encode(f.name),data=enc.encode(f.data),crc=crc32(data);const local=new Uint8Array([...u32(0x04034b50),...u16(20),...u16(0),...u16(0),...u16(0),...u16(0),...u32(crc),...u32(data.length),...u32(data.length),...u16(name.length),...u16(0),...name,...data]);parts.push(local);const cd=new Uint8Array([...u32(0x02014b50),...u16(20),...u16(20),...u16(0),...u16(0),...u16(0),...u16(0),...u32(crc),...u32(data.length),...u32(data.length),...u16(name.length),...u16(0),...u16(0),...u16(0),...u16(0),...u32(0),...u32(offset),...name]);central.push(cd);offset+=local.length}const centralLen=central.reduce((a,x)=>a+x.length,0),end=new Uint8Array([...u32(0x06054b50),...u16(0),...u16(0),...u16(files.length),...u16(files.length),...u32(centralLen),...u32(offset),...u16(0)]);return new Blob([...parts,...central,end],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'})}
    function safeSheetName(name,used){let n=String(name||'Batch').replace(/[\\/*?:\[\]]/g,' ').trim().slice(0,31)||'Batch';let base=n,i=2;while(used.has(n.toLowerCase())){const suffix=' '+i++;n=base.slice(0,31-suffix.length)+suffix}used.add(n.toLowerCase());return n}
    function xlsxBlob(sheets){const used=new Set(),names=sheets.map(s=>safeSheetName(s.name,used));const files=[];files.push({name:'[Content_Types].xml',data:`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>${sheets.map((_,i)=>`<Override PartName="/xl/worksheets/sheet${i+1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}</Types>`});files.push({name:'_rels/.rels',data:'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'});files.push({name:'xl/workbook.xml',data:`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${names.map((n,i)=>`<sheet name="${xmlEscape(n)}" sheetId="${i+1}" r:id="rId${i+1}"/>`).join('')}</sheets></workbook>`});files.push({name:'xl/_rels/workbook.xml.rels',data:`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((_,i)=>`<Relationship Id="rId${i+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i+1}.xml"/>`).join('')}</Relationships>`});sheets.forEach((s,i)=>files.push({name:`xl/worksheets/sheet${i+1}.xml`,data:worksheetXml(s.rows)}));return zipStore(files)}
    function rowsForBatch(b){const dates=attendanceDates().filter(d=>b.students.some(s=>Object.prototype.hasOwnProperty.call(state.records[d]||{},s.id)));const rows=[['Batch',b.name],['Generated on',fmtDate(today())],[],['Roll No.','Student Name',...dates.map(fmtDate),'Present Days','Absent Days','Attendance %']];b.students.forEach(s=>{let p=0,a=0;const cells=dates.map(d=>{const yes=statusOf(s,d,'regular');if(yes)p++;else a++;return yes?'Present':'Absent'});const pct=dates.length?Math.round(p/dates.length*10000)/100:0;rows.push([s.roll||'',s.name,...cells,p,a,`${pct}%`])});return rows}
    function download(blob,filename){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500)}
    
    // Workshop Management State & Handlers
    if(!state.workshops) state.workshops=[];
    function currentWorkshop(){
      const wName = $('workshopName').value.trim() || 'Default Workshop';
      const wDate = $('workshopDate').value || today();
      let found = state.workshops.find(w => w.name === wName && w.date === wDate);
      if(!found){
        found = { id: uid(), name: wName, date: wDate, students: [], records: {} };
        state.workshops.push(found);
      }
      return found;
    }
    
    function renderWorkshop(){
      const w = currentWorkshop();
      const list = $('workshopAttendanceList');
      if(!list) return;
      const students = w.students || [];
      let present = 0;
      students.forEach(s => { if(w.records[s.id]) present++; });
      $('workshopTotalCount').textContent = students.length;
      $('workshopPresentCount').textContent = present;
      $('workshopAbsentCount').textContent = students.length - present;
    
      if(!students.length){
        list.innerHTML = '<div class="empty">No participants added to this workshop yet. Import from an existing batch or add participants below.</div>';
        return;
      }
    
      list.innerHTML = students.map(s=>{
        const p = !!w.records[s.id];
        return `<div class="student-row"><div class="avatar">${esc((s.name.trim()[0]||'?').toUpperCase())}</div><div class="student-info"><div class="student-name">${esc(s.name)}</div><div class="student-roll">${s.roll?`Roll No. ${esc(s.roll)}`:'Participant'}</div></div><button class="toggle ${p?'present':'absent'}" data-wtoggle="${esc(s.id)}">${p?'✓ Present':'✕ Absent'}</button></div>`;
      }).join('');
    
      list.querySelectorAll('[data-wtoggle]').forEach(btn=>{
        btn.onclick = () => {
          const sid = btn.dataset.wtoggle;
          w.records[sid] = !w.records[sid];
          save();
          renderWorkshop();
        };
      });
    }
    
    // Weekly Report Builder
    function generateWeeklySummaryText(batchId, startDateStr){
      const b = state.batches.find(x => x.id === batchId);
      if(!b) return 'Select a valid batch.';
      if(!startDateStr) return 'Select a valid start date.';
    
      const start = new Date(startDateStr);
      const dates = [];
      for(let i=0; i<7; i++){
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        const iso = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
        dates.push(iso);
      }
    
      let text = `WEEKLY ATTENDANCE REPORT\nBatch: ${b.name}\nWeek: ${fmtDate(dates[0])} to ${fmtDate(dates[6])}\n\n`;
      b.students.forEach((s, idx)=>{
        let presentCount = 0;
        dates.forEach(d => {
          if(statusOf(s, d, 'regular')) presentCount++;
        });
        text += `${idx+1}. ${s.name}: ${presentCount}/7 sessions present\n`;
      });
      return text;
    }
    
    // Event Listeners Initialization
    $('todayLabel').textContent=new Date().toLocaleDateString(undefined,{weekday:'short',day:'numeric',month:'short',year:'numeric'});
    $('attendanceDate').value=today();
    if($('workshopDate')) $('workshopDate').value=today();
    
    document.querySelectorAll('.tab').forEach(btn=>btn.addEventListener('click',()=>{
      document.querySelectorAll('.tab').forEach(t=>t.classList.toggle('active',t===btn));
      document.querySelectorAll('.page').forEach(p=>p.classList.toggle('active',p.id===`page-${btn.dataset.page}`));
      if(btn.dataset.page==='reports') renderHistory();
      if(btn.dataset.page==='workshop') renderWorkshop();
    }));
    
    $('attendanceBatch').addEventListener('change',renderAttendance);
    $('attendanceDate').addEventListener('change',renderAttendance);
    $('sessionSlotSelect').addEventListener('change',renderAttendance);
    $('historyBatch').addEventListener('change',renderHistory);
    
    $('overrideSundayBtn').addEventListener('click', ()=>{
      const date=$('attendanceDate').value||today();
      state.records[`${date}_override`] = true;
      save();
      renderAttendance();
      notify('Sunday attendance enabled for this date');
    });
    
    $('markHolidayBtn').addEventListener('click', ()=>{
      const date=$('attendanceDate').value||today();
      const purpose = prompt('Enter purpose for holiday (e.g. National Festival, Exam Break):', 'Holiday');
      if(purpose !== null){
        state.holidays[date] = { purpose: purpose.trim() || 'Holiday' };
        save();
        renderAttendance();
        notify('Marked as holiday');
      }
    });
    
    $('removeHolidayBtn').addEventListener('click', ()=>{
      const date=$('attendanceDate').value||today();
      delete state.holidays[date];
      save();
      renderAttendance();
      notify('Holiday status removed');
    });
    
    $('markAllPresent').addEventListener('click',()=>{
      const b=activeBatch(),d=$('attendanceDate').value||today(),slot=$('sessionSlotSelect').value;
      if(!b){notify('Create a batch first');return}
      b.students.forEach(s=>record(d, slot)[s.id]=true);
      save();
      renderAttendance();
      renderHistory();
      notify('Everyone marked present');
    });
    
    $('copyAbsent').addEventListener('click',()=>{
      const b=activeBatch();
      if(!b){notify('Create a batch first');return}
      copyText(absentText(b,$('attendanceDate').value||today(),$('sessionSlotSelect').value));
    });
    
    $('shareAbsent').addEventListener('click',()=>{
      const b=activeBatch(),date=$('attendanceDate').value||today(),slot=$('sessionSlotSelect').value;
      if(!b){notify('Create a batch first');return}
      const msg=absentText(b,date,slot);
      location.href='https://wa.me/?text='+encodeURIComponent(msg);
    });
    
    $('addBatch').addEventListener('click',()=>{
      const name=$('newBatchName').value.trim();
      if(!name){notify('Enter a batch name');return}
      if(state.batches.some(b=>b.name.toLowerCase()===name.toLowerCase())){notify('A batch with that name already exists');return}
      state.batches.push({id:uid(),name,students:[]});
      $('newBatchName').value='';
      save();
      refresh();
      $('attendanceBatch').value=state.batches[state.batches.length-1].id;
      renderAttendance();
      notify('Batch added');
    });
    
    function addStudent(batch,name,roll){
      if(!batch)throw Error('Create or choose a batch first');
      if(!name.trim())throw Error('Enter a student name');
      if(batch.students.some(s=>s.name.toLowerCase()===name.trim().toLowerCase()))throw Error(`“${name.trim()}” already exists in this batch`);
      batch.students.push({id:uid(),name:name.trim(),roll:(roll||'').trim()});
    }
    
    $('addStudent').addEventListener('click',()=>{
      const b=state.batches.find(x=>x.id===$('studentBatch').value);
      try{
        addStudent(b,$('newStudentName').value,$('newRoll').value);
        $('newStudentName').value='';$('newRoll').value='';
        save();refresh();notify('Student added');
      }catch(e){notify(e.message)}
    });
    
    $('bulkAdd').addEventListener('click',()=>{
      const b=state.batches.find(x=>x.id===$('studentBatch').value);
      if(!b){notify('Create or choose a batch first');return}
      const lines=$('bulkStudents').value.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
      if(!lines.length){notify('Paste student names first');return}
      let count=0,errors=[];
      lines.forEach((line,i)=>{
        const parts=line.split(/\s*,\s*/);
        let roll='',name=line;
        if(parts.length>1){roll=parts.shift();name=parts.join(',')}
        try{addStudent(b,name,roll);count++}catch(e){errors.push(`Line ${i+1}: ${e.message}`)}
      });
      $('bulkStudents').value='';
      save();refresh();
      notify(`${count} student(s) added${errors.length?`; ${errors.length} skipped`:''}`);
      if(errors.length)alert('Some entries were skipped:\n'+errors.join('\n'));
    });
    
    // Workshop Listeners
    $('workshopName').addEventListener('input', renderWorkshop);
    $('workshopDate').addEventListener('change', renderWorkshop);
    
    $('importBatchToWorkshop').addEventListener('click', ()=>{
      const bid = $('workshopSourceBatch').value;
      const b = state.batches.find(x=>x.id === bid);
      if(!b){ notify('Select a valid batch to import'); return; }
      const w = currentWorkshop();
      let added = 0;
      b.students.forEach(st => {
        if(!w.students.some(ws => ws.name.toLowerCase() === st.name.toLowerCase())){
          w.students.push({ id: uid(), name: st.name, roll: st.roll || '' });
          added++;
        }
      });
      save();
      renderWorkshop();
      notify(`Imported ${added} students into workshop`);
    });
    
    $('addWorkshopStudent').addEventListener('click', ()=>{
      const name = $('workshopNewStudent').value.trim();
      if(!name){ notify('Enter participant name'); return; }
      const w = currentWorkshop();
      w.students.push({ id: uid(), name, roll: '' });
      $('workshopNewStudent').value = '';
      save();
      renderWorkshop();
      notify('Participant added');
    });
    
    $('copyWorkshopReport').addEventListener('click', ()=>{
      const w = currentWorkshop();
      let txt = `WORKSHOP REPORT: ${w.name}\nDate: ${fmtDate(w.date)}\nTotal: ${w.students.length}\n\n`;
      w.students.forEach((s, i)=>{
        const p = !!w.records[s.id];
        txt += `${i+1}. ${s.name} - ${p ? 'Present' : 'Absent'}\n`;
      });
      copyText(txt);
    });
    
    $('shareWorkshopWhatsApp').addEventListener('click', ()=>{
      const w = currentWorkshop();
      let txt = `WORKSHOP REPORT: ${w.name}\nDate: ${fmtDate(w.date)}\nTotal: ${w.students.length}\n\n`;
      w.students.forEach((s, i)=>{
        const p = !!w.records[s.id];
        txt += `${i+1}. ${s.name} - ${p ? 'Present' : 'Absent'}\n`;
      });
      location.href = 'https://wa.me/?text=' + encodeURIComponent(txt);
    });
    
    // Weekly Report Listeners
    if($('weeklyReportDate')) $('weeklyReportDate').value = today();
    
    $('generateWeeklyReport').addEventListener('click', ()=>{
      const bid = $('weeklyReportBatch').value;
      const dt = $('weeklyReportDate').value;
      const summary = generateWeeklySummaryText(bid, dt);
      $('weeklyReportOutput').textContent = summary;
      $('shareWeeklyReport').style.display = 'block';
    });
    
    $('shareWeeklyReport').addEventListener('click', ()=>{
      const bid = $('weeklyReportBatch').value;
      const dt = $('weeklyReportDate').value;
      const summary = generateWeeklySummaryText(bid, dt);
      location.href = 'https://wa.me/?text=' + encodeURIComponent(summary);
    });
    
    $('exportAbsentTxt').addEventListener('click',()=>{
      const b=activeBatch();
      if(!b){notify('Choose a batch on Take attendance first');return}
      download(new Blob([absentText(b,$('attendanceDate').value||today())],{type:'text/plain;charset=utf-8'}),`Absent_${b.name.replace(/[^a-z0-9_-]+/gi,'_')}_${$('attendanceDate').value||today()}.txt`);
      notify('Absent-only list downloaded');
    });
    
    $('exportOneBatch').addEventListener('click',()=>exportBatch(state.batches.find(b=>b.id===$('exportBatch').value)));
    function exportBatch(b){if(!b){notify('Choose a batch first');return}const blob=xlsxBlob([{name:b.name,rows:rowsForBatch(b)}]);download(blob,`Attendance_${b.name.replace(/[^a-z0-9_-]+/gi,'_')}_${today()}.xlsx`);notify('Excel workbook downloaded')}
    
    $('exportAllBatches').addEventListener('click',()=>{
      if(!state.batches.length){notify('Create a batch first');return}
      const dates=attendanceDates();
      const combined=[['Batch','Roll No.','Student Name',...dates.map(fmtDate),'Present Days','Absent Days','Attendance %']];
      state.batches.forEach(b=>b.students.forEach(s=>{
        let p=0,a=0;
        const cells=dates.map(d=>{const yes=statusOf(s,d,'regular');if(yes)p++;else a++;return yes?'Present':'Absent'});
        combined.push([b.name,s.roll||'',s.name,...cells,p,a,`${dates.length?Math.round(p/dates.length*10000)/100:0}%`])
      }));
      const sheets=[{name:'All Students',rows:combined},...state.batches.map(b=>({name:b.name,rows:rowsForBatch(b)}))];
      download(xlsxBlob(sheets),`All_Batches_Attendance_${today()}.xlsx`);
      notify('All-batches Excel workbook downloaded');
    });
    
    $('backupData').addEventListener('click',()=>download(new Blob([JSON.stringify(state,null,2)],{type:'application/json'}),`ClassMate_Backup_${today()}.json`));
    $('restoreFile').addEventListener('change',async e=>{
      const f=e.target.files[0];
      if(!f)return;
      try{
        const imported=JSON.parse(await f.text());
        if(!Array.isArray(imported.batches)||!imported.records||typeof imported.records!=='object')throw Error('This file is not a ClassMate backup');
        if(!confirm('Restore this backup? Current records on this device will be replaced.'))return;
        state=imported;save();refresh();notify('Backup restored');
      }catch(err){notify(err.message||'Could not restore backup')}
      finally{e.target.value=''}
    });
    
    if('serviceWorker'in navigator&&/^https?:$/.test(location.protocol)){
      window.addEventListener('load',()=>navigator.serviceWorker.register('./service-worker.js').catch(()=>{}))
    }
    
    refresh();
    })();
