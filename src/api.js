import { Observable, throwError } from "rxjs";
import { timeout, catchError } from "rxjs/operators";

function shuffleArray(array) {
  return array.sort(() => Math.random() - 0.5);
}

export function getUsers(count = 10) {
  return new Observable(observer => {
    const controller = new AbortController();
    const signal = controller.signal;

    fetch("https://api.github.com/users?per_page=100", { signal })
      .then(res => res.json())
      .then(data => {
        const shuffled = shuffleArray(data).slice(0, count);
        observer.next(shuffled);
        observer.complete();
      })
      .catch(err => {
        if (err.name !== "AbortError") {
          observer.error(err);
        }
      });

    return () => controller.abort();
  }).pipe(
    timeout({
      each: 100, // ⏱ Timeout after 200ms if response is not received
      with: () => throwError(() => new Error(`Request timed out after ${each}ms`))
    }),
    catchError(err => throwError(() => err))
  );
}
