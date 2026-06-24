// The Director — the campus's job bus, and the spine of the master loop (paper §10).
// It is pure logic (no three.js): any system can POST a job ("harvest ready at field 3
// → storage", "heat flare → recon", "block 4 water-stress → irrigate"); any actor can
// CLAIM a job that matches its capabilities, then COMPLETE it. Storage levels live here
// too, so deliveries have a consequence the world can read. This is the substrate that
// lets us "just fill in content": new sources emit jobs, new actors consume them, and
// the perception→cognition→action→consequence loop stays one place.

let _id = 0;

export function createDirector({ onLog } = {}) {
  const jobs = [];                 // open + in-flight jobs
  const stores = new Map();        // id -> { level, capacity }
  const listeners = new Set();     // notified when a job is posted (actors wake up)

  function defineStore(id, capacity = 100, level = 0) { stores.set(id, { level, capacity }); }
  function storeLevel(id) { const s = stores.get(id); return s ? s.level / s.capacity : 0; }
  function deposit(id, amount) { const s = stores.get(id); if (s) s.level = Math.max(0, Math.min(s.capacity, s.level + amount)); }

  // post(job): job = { type, from, to, payload, priority }. from/to are world points
  // (or store ids); the consuming actor decides how to interpret them.
  function post(job) {
    const j = { id: ++_id, claimed: false, done: false, ...job, priority: job.priority ?? 1 };
    jobs.push(j);
    if (onLog && job.label) onLog(job.label, job.col);
    listeners.forEach(fn => fn(j));
    return j;
  }

  // claim(match): highest-priority unclaimed job for which match(job) is true.
  function claim(match) {
    let best = null;
    for (const j of jobs) {
      if (j.claimed || j.done) continue;
      if (!match(j)) continue;
      if (!best || j.priority > best.priority) best = j;
    }
    if (best) best.claimed = true;
    return best;
  }

  function release(job) { if (job) job.claimed = false; }          // actor gave up
  function complete(job) { if (!job) return; job.done = true; const i = jobs.indexOf(job); if (i >= 0) jobs.splice(i, 1); }

  function onPost(fn) { listeners.add(fn); return () => listeners.delete(fn); }

  function pendingCount(type) { return jobs.filter(j => !j.done && (!type || j.type === type)).length; }

  return { post, claim, release, complete, onPost, pendingCount, defineStore, deposit, storeLevel, stores, get jobs() { return jobs; } };
}
