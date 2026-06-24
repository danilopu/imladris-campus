// The Dispatcher closes the master loop visibly. It listens to every job the Director
// posts and, for each one, (1) races a pulse from the nearest sensor up to the brain —
// "the campus notices" — then (2) fires the matching muscle effect. Routine ops complete
// immediately; actor jobs (e.g. harvest) stay open for a rover to claim. The result: one
// bus, where perception → cognition → action runs the same way for every subsystem.
export function buildDispatcher({ director, network, effects = {} }) {
  director.onPost((job) => {
    if (job.from) network.alert(job.from, job.col); // sense → brain (pulse tinted to the signal)
    const fx = effects[job.type];
    if (fx) fx(job);                                 // act
    if (job.instant) director.complete(job);         // instant ops have no actor to claim them
  });
}
