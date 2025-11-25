// JS minimal pour gérer l'ajout d'entraînements, la structure des séances
// et le stockage local (localStorage).
// Format stocké pour une séance:
// { date: 'YYYY-MM-DD', notes: '...', exercises: [ { name: 'Exo', sets: [ { reps: '8', weight: '80' }, ... ] }, ... ] }
(function(){
  // Références DOM principales
  const form = document.getElementById('workoutForm');
  const list = document.getElementById('workoutList');
  const summary = document.getElementById('summary');
  const exercisesContainer = document.getElementById('exercisesContainer');
  const addExerciseBtn = document.getElementById('addExerciseBtn');
  const clearExercisesBtn = document.getElementById('clearExercisesBtn');

  // Charge le tableau de séances depuis localStorage (ou [] si absent)
  function loadWorkouts(){
    try{ return JSON.parse(localStorage.getItem('workouts')||'[]'); }
    catch(e){ return []; }
  }

  // Sauvegarde le tableau de séances en JSON dans localStorage
  function saveWorkouts(arr){
    localStorage.setItem('workouts', JSON.stringify(arr));
  }

  // Protège les valeurs affichées contre l'injection HTML
  function escapeHtml(s){
    if(s === null || s === undefined) return '';
    return String(s).replace(/[&<>"'`]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;', '`':'&#96;'}[c];});
  }

  // Rend la liste d'historique dans le DOM à partir des données stockées
  function render(){
    const items = loadWorkouts();
    list.innerHTML = '';
    if(items.length===0){
      summary.textContent = "Aucune séance enregistrée.";
      return;
    }
    summary.textContent = `${items.length} séance(s) enregistrée(s)`;
    // on affiche les séances les plus récentes en premier
    items.slice().reverse().forEach((w, i)=>{
      const li = document.createElement('li');
      li.className = 'list-group-item';
      // construire le HTML des exercices et séries pour cette séance
      let exercisesHtml = '';
      (w.exercises||[]).forEach((ex, exIdx)=>{
        exercisesHtml += `<div class="mb-2"><div class="fw-bold">${escapeHtml(ex.name)}</div><ul class="mb-0 small">`;
        (ex.sets||[]).forEach((s, sIdx)=>{
          exercisesHtml += `<li>Série ${sIdx+1}: ${escapeHtml(s.reps)} ${s.weight?('· '+escapeHtml(s.weight)+' kg') : ''}</li>`;
        });
        exercisesHtml += `</ul></div>`;
      });

      li.innerHTML = `<div>
          <div class="fw-bold">${escapeHtml(w.date)}</div>
          <div class="small text-muted mb-2">${w.notes? escapeHtml(w.notes) : ''}</div>
          ${exercisesHtml}
        </div>
        <div class="mt-2"><button class="btn btn-sm btn-outline-light" data-index="${i}">Suppr</button></div>`;

      const btn = li.querySelector('button');
      btn.addEventListener('click', ()=>{ removeAt(items.length-1 - i); });
      list.appendChild(li);
    });
  }

  // Supprime une séance par index (après confirmation)
  function removeAt(idx){
    const items = loadWorkouts();
    if(idx<0||idx>=items.length) return;
    if(!confirm('Supprimer cette séance ?')) return;
    items.splice(idx,1);
    saveWorkouts(items);
    render();
  }

  // Crée une ligne de série (inputs pour répétitions et poids)
  function createSetRow(setData){
    const row = document.createElement('div');
    row.className = 'd-flex gap-2 align-items-center mb-2 set-row';

    const repsInput = document.createElement('input');
    repsInput.type = 'number';
    repsInput.inputMode = 'numeric';
    repsInput.pattern = '\\d*';
    repsInput.min = '0';
    repsInput.step = '1';
    repsInput.className = 'form-control form-control-sm set-reps';
    repsInput.placeholder = 'Rép (ex: 8)';
    repsInput.value = escapeHtml((setData&&setData.reps)||'');

    const weightInput = document.createElement('input');
    weightInput.type = 'number';
    weightInput.inputMode = 'decimal';
    weightInput.min = '0';
    weightInput.step = '0.1';
    weightInput.className = 'form-control form-control-sm set-weight';
    weightInput.placeholder = 'Poids (kg)';
    weightInput.value = escapeHtml((setData&&setData.weight)||'');

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'btn btn-sm btn-outline-light btn-remove-set';
    removeBtn.textContent = '✖';
    removeBtn.addEventListener('click', ()=>{ row.remove(); });

    // Nettoyage des saisies :
    // - répétitions : conserver uniquement les chiffres (entiers)
    repsInput.addEventListener('input', ()=>{
      repsInput.value = repsInput.value.replace(/\D+/g, '');
    });
    // - poids : autoriser chiffres et un seul point décimal
    weightInput.addEventListener('input', ()=>{
      weightInput.value = weightInput.value.replace(/[^0-9.]+/g, '');
      const parts = weightInput.value.split('.');
      if(parts.length>2){
        weightInput.value = parts[0] + '.' + parts.slice(1).join('');
      }
    });

    row.appendChild(repsInput);
    row.appendChild(weightInput);
    row.appendChild(removeBtn);
    return row;
  }

  // Crée une carte DOM pour un exercice, contenant le nom et ses séries
  function createExerciseCard(exData){
    const card = document.createElement('div');
    card.className = 'card mb-3 exercise-card';
    const cardBody = document.createElement('div');
    cardBody.className = 'card-body';
    cardBody.innerHTML = `
      <div class="d-flex justify-content-between align-items-start mb-2">
        <label class="form-label mb-0">Exercice</label>
        <button type="button" class="btn btn-sm btn-outline-light btn-remove-exercise">Suppr exercice</button>
      </div>
    `;
    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.className = 'form-control mb-2 exercise-name';
    nameInput.placeholder = 'Nom de l\'exercice (ex: Développé couché)';
    nameInput.value = exData && exData.name ? exData.name : '';

    const setsContainer = document.createElement('div');
    setsContainer.className = 'sets-container mb-2';

    const addSetBtn = document.createElement('button');
    addSetBtn.type = 'button';
    addSetBtn.className = 'btn btn-sm btn-outline-light mb-2';
    addSetBtn.textContent = 'Ajouter une série';
    addSetBtn.addEventListener('click', ()=>{ setsContainer.appendChild(createSetRow()); });

    cardBody.appendChild(nameInput);
    cardBody.appendChild(setsContainer);
    cardBody.appendChild(addSetBtn);
    card.appendChild(cardBody);

    // Gestionnaire suppression d'un exercice (avec confirmation)
    card.querySelector('.btn-remove-exercise').addEventListener('click', ()=>{ if(confirm('Supprimer cet exercice ?')) card.remove(); });

    // initialize sets
    const initialSets = (exData && exData.sets && exData.sets.length) ? exData.sets : [{}];
    initialSets.forEach(s=> setsContainer.appendChild(createSetRow(s)));

    return card;
  }

  function addExercise(exData){
    exercisesContainer.appendChild(createExerciseCard(exData));
  }

  // Boutons pour ajouter ou réinitialiser les exercices dans le formulaire
  addExerciseBtn.addEventListener('click', ()=> addExercise());
  clearExercisesBtn.addEventListener('click', ()=>{ if(confirm('Réinitialiser tous les exercices ?')){ exercisesContainer.innerHTML=''; addExercise(); } });

  // Bouton d'export JSON : télécharge toutes les séances et exercices au format JSON
  const exportBtn = document.getElementById('exportJsonBtn');
  function exportWorkoutsToJson(){
    const items = loadWorkouts();
    if(!items || items.length===0){ alert('Aucune séance à exporter.'); return; }
    const json = JSON.stringify(items, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const now = new Date();
    const pad = n => String(n).padStart(2, '0');
    const filename = `seances_${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}.json`;
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }
  if(exportBtn) exportBtn.addEventListener('click', exportWorkoutsToJson);

  // Soumission du formulaire : collecte des données structurées
  form.addEventListener('submit', function(e){
    e.preventDefault();
    const date = document.getElementById('date').value;
    const notes = document.getElementById('notes').value.trim();
    if(!date){ alert('Remplis la date.'); return; }

    const exerciseCards = Array.from(document.querySelectorAll('.exercise-card'));
    const exercises = [];
    exerciseCards.forEach(card=>{
      const name = card.querySelector('.exercise-name').value.trim();
      if(!name) return; // skip empty
      const sets = [];
      const setRows = Array.from(card.querySelectorAll('.set-row'));
      setRows.forEach(r=>{
        const reps = r.querySelector('.set-reps').value.trim();
        const weight = r.querySelector('.set-weight').value.trim();
        if(!reps && !weight) return; // skip empty rows
        sets.push({ reps, weight });
      });
      if(sets.length>0) exercises.push({ name, sets });
    });

    if(exercises.length===0){ alert('Ajoute au moins un exercice avec au moins une série.'); return; }

    const items = loadWorkouts();
    items.push({ date, notes, exercises });
    saveWorkouts(items);

    // Réinitialiser le formulaire : vider la liste d'exercices et ajouter un exercice vide par défaut
    form.reset();
    exercisesContainer.innerHTML = '';
    addExercise();
    render();
  });

  // État initial : une carte exercice vide et affichage de l'historique
  addExercise();
  render();

})();
