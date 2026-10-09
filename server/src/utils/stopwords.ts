// English and common Filipino function words, ignored when looking for key terms.
const WORDS = `
a about above after again against all also am an and any are as at be because been before being below between both
but by can could did do does doing down during each few for from further had has have having he her here hers him his
how i if in into is it its itself just may me might more most must my no nor not now of off on once only or other our
out over own same shall she should so some such than that the their them then there these they this those through to
too under until up upon very was we were what when where which while who whom why will with would you your
along saw got get getting going went came also however therefore thus among within without per via etc using use used based many much one two three first second
ang ng sa mga na at ay para pa ito iyan iyon ni si kay kung ngunit dahil kaya din rin po ba lang lamang naman
mo ko ka ako ikaw siya kami tayo kayo sila natin namin nila ating amin kanilang aming isang may mayroon wala
upang habang bilang tungkol ayon mula hanggang pagkatapos bago kapag sapagkat subalit
`;

export const STOPWORDS = new Set(WORDS.split(/\s+/).filter(Boolean));
