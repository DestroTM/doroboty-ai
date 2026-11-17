/**
 * Prepared pre-invitation questions per persona. This is scenario content,
 * not model output: the texts never change with the job or the answer.
 */
export type PreparedQuestion = {
  text: string;
  /** Literal CV fragment the question refers to; shown only when it occurs in the snapshot. */
  basis: string;
  purpose: string;
  expect: string;
  warning: string;
  verify: string;
};

const scenarios: Record<string, PreparedQuestion[]> = {
  "candidate-marek": [
    {
      text: "Opisz automatyzację obsługi zgłoszeń z Twojego CV. Za które jej części odpowiadasz Ty, a za które zespół wdrożeniowy?",
      basis: "Automatyzacja obsługi zgłoszeń i skrócenie czasu odpowiedzi o 25%.",
      purpose: "Oddzielić własny wkład od pracy zespołu wdrożeniowego.",
      expect:
        "Konkretnych kroków w pierwszej osobie: co było do ustalenia, jaką decyzję podjęto i kto ją wykonał.",
      warning: "Tylko „zrobiliśmy” i wynik całego projektu, bez żadnej własnej decyzji.",
      verify: "Poproś o jedną decyzję, którą trzeba było obronić przed zespołem lub klientem.",
    },
    {
      text: "Skąd wiadomo, że czas odpowiedzi skrócił się o 25%? Kto to liczył i z jakich danych?",
      basis: "skrócenie czasu odpowiedzi o 25%",
      purpose: "Sprawdzić, czy za liczbą z CV stoi znany sposób pomiaru.",
      expect: "Okresu przed zmianą i po niej, źródła danych i osoby, która liczyła wynik.",
      warning: "Liczba bez sposobu liczenia albo odesłanie do „raportu zespołu”.",
      verify: "Zapytaj, co jeszcze zmieniło się w tym samym czasie i mogło wpłynąć na wynik.",
    },
    {
      text: "Podaj przykład zgłoszenia, z którym automatyzacja sobie nie poradziła. Co się wtedy stało?",
      basis: "",
      purpose: "Sprawdzić, czy jest nawyk oglądania przypadków, w których narzędzie się myli.",
      expect: "Jednego konkretnego przypadku, sposobu wykrycia i poprawki.",
      warning: "„Działało bez problemów” albo brak jakiegokolwiek przykładu.",
      verify: "Zapytaj, jak często takie przypadki się zdarzały i skąd to wiadomo.",
    },
  ],
  "candidate-anna": [
    {
      text: "Opisz wdrożenie asystenta do zgłoszeń z Twojego CV. Które decyzje były Twoje, a które zespołu technicznego?",
      basis: "wdrożenie asystenta do zgłoszeń",
      purpose: "Oddzielić decyzje produktowe kandydatki od pracy inżynierów.",
      expect:
        "Podziału w pierwszej osobie: zakres asystenta, kryteria gotowości, co zostawiono ludziom.",
      warning: "Opis działania narzędzia bez żadnej własnej decyzji.",
      verify: "Poproś o przykład funkcji, z której zrezygnowano, i o powód.",
    },
    {
      text: "Jak wybrano 18 użytkowników do badań i co zmieniło się w planie po rozmowach z nimi?",
      basis: "Badania z 18 użytkownikami",
      purpose: "Sprawdzić, czy badania wpłynęły na decyzje, a nie tylko się odbyły.",
      expect: "Kryteriów doboru i jednej zmiany w planie, która wynikła z rozmów.",
      warning: "Liczba rozmów bez żadnego wniosku, który coś zmienił.",
      verify: "Zapytaj o wniosek, który okazał się błędny po wdrożeniu.",
    },
    {
      text: "Skąd wiadomo, że czas obsługi skrócił się o 30%? Co porównano i w jakim okresie?",
      basis: "Skrócenie czasu obsługi o 30%.",
      purpose: "Sprawdzić sposób pomiaru efektu podanego w CV.",
      expect: "Miary sprzed zmiany i po niej, okresu porównania i źródła danych.",
      warning: "Deklaracja wyniku bez sposobu liczenia.",
      verify: "Zapytaj, kto liczył wynik i czy porównano go z grupą bez asystenta.",
    },
  ],
};

const fallback: PreparedQuestion[] = [
  {
    text: "Wybierz jeden projekt ze swojego CV. Za które jego części odpowiadasz Ty, a za które inne osoby?",
    basis: "",
    purpose: "Oddzielić własny wkład od pracy zespołu.",
    expect: "Konkretnych kroków w pierwszej osobie i jednej własnej decyzji.",
    warning: "Tylko „zrobiliśmy” i ogólniki o projekcie.",
    verify: "Poproś o szczegóły jednej decyzji: co było do wyboru i dlaczego wybrano tak.",
  },
  {
    text: "Podaj przykład sytuacji, w której narzędzie AI dało zły wynik. Jak to wykryto i co zmieniono?",
    basis: "",
    purpose: "Sprawdzić, czy jest nawyk sprawdzania wyników narzędzi AI.",
    expect: "Jednego konkretnego przypadku, sposobu wykrycia i poprawki.",
    warning: "„Zawsze działało” albo brak przykładu.",
    verify: "Zapytaj, jak sprawdzono, że poprawka zadziałała.",
  },
];

/** Returns prepared questions; a basis absent from the CV snapshot is dropped, never invented. */
export function preparedQuestions(candidateId: string, cv: string): PreparedQuestion[] {
  return (scenarios[candidateId] ?? fallback).map((question) => ({
    ...question,
    basis: question.basis && cv.includes(question.basis) ? question.basis : "",
  }));
}
