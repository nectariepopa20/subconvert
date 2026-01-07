'use client';

import { useState } from 'react';

export default function Home() {
  const [sourceText, setSourceText] = useState('');
  const [resultText, setResultText] = useState('');

  const fixIncompleteQuotationMarks = (text: string): string => {
    const lines = text.split('\n');

    type SubtitleBlock = {
      startIndex: number;
      endIndex: number;
      subtitleLines: string[];
      hasAnyQuotes: boolean;
      allLinesFullyWrapped: boolean;
    };

    const blocks: SubtitleBlock[] = [];
    let i = 0;

    // Prima trecere: identificăm blocurile de subtitrare și dacă folosesc ghilimele
    while (i < lines.length) {
      const subtitleNumberMatch = lines[i].match(/^\d+$/);

      if (subtitleNumberMatch) {
        const startIndex = i;
        let endIndex = i;

        // Caută sfârșitul blocului curent (până la următorul număr de subtitrare sau EOF)
        while (endIndex + 1 < lines.length && !/^\d+$/.test(lines[endIndex + 1])) {
          endIndex++;
        }

        const subtitleLines: string[] = [];

        // Extrage liniile de text (sări peste număr și timestamp)
        for (let j = startIndex + 2; j <= endIndex; j++) {
          const line = lines[j];
          if (
            line &&
            line.trim() &&
            !/^\d{2}:\d{2}:\d{2},\d{3} --> \d{2}:\d{2}:\d{2},\d{3}$/.test(line.trim())
          ) {
            subtitleLines.push(line);
          }
        }

        let hasAnyQuotes = false;
        let allLinesFullyWrapped = true;

        if (subtitleLines.length > 0) {
          for (const rawLine of subtitleLines) {
            const t = rawLine.trim();
            if (!t) continue;

            const startsWithQuote =
              t.startsWith('„') || t.startsWith('”') || t.startsWith('"');
            const endsWithQuote = t.endsWith('„') || t.endsWith('”') || t.endsWith('"');

            if (startsWithQuote || endsWithQuote) {
              hasAnyQuotes = true;
            }

            // Dacă există vreo linie cu ghilimele doar pe o singură margine
            // (sau deloc pe margini, dar vom considera doar marginea),
            // blocul NU este complet ghilimeat.
            if (startsWithQuote !== endsWithQuote) {
              allLinesFullyWrapped = false;
            }
          }
        }

        blocks.push({
          startIndex,
          endIndex,
          subtitleLines,
          hasAnyQuotes,
          allLinesFullyWrapped,
        });

        i = endIndex + 1;
      } else {
        i++;
      }
    }

    // A doua trecere: normalizăm ghilimelele, având context de blocuri vecine
    const result: string[] = [];
    let currentBlockIndex = 0;

    // Helperi pentru a găsi cel mai apropiat bloc cu ghilimele înainte / după
    // Căutăm doar până la 4 blocuri înapoi/înainte pentru a evita propagarea pe toată subtitrarea
    const MAX_LOOKBACK = 4;
    const MAX_LOOKAHEAD = 4;

    const findPrevQuotedBlock = (index: number): SubtitleBlock | undefined => {
      for (let step = 1; step <= MAX_LOOKBACK; step++) {
        const j = index - step;
        if (j < 0) break;
        if (blocks[j].hasAnyQuotes) {
          return blocks[j];
        }
      }
      return undefined;
    };

    const findNextQuotedBlock = (index: number): SubtitleBlock | undefined => {
      for (let step = 1; step <= MAX_LOOKAHEAD; step++) {
        const j = index + step;
        if (j >= blocks.length) break;
        if (blocks[j].hasAnyQuotes) {
          return blocks[j];
        }
      }
      return undefined;
    };

    i = 0;
    while (i < lines.length) {
      const block = blocks[currentBlockIndex];

      if (block && i === block.startIndex) {
        const { startIndex, endIndex, subtitleLines, hasAnyQuotes } = block;

        const prevQuoted = findPrevQuotedBlock(currentBlockIndex);
        const nextQuoted = findNextQuotedBlock(currentBlockIndex);

        // Decidem dacă normalizăm:
        // - dacă blocul are deja ghilimele
        // - SAU dacă este între două blocuri (nu neapărat vecine) cu ghilimele,
        //   iar ambele capete sunt blocuri incomplete (nu complet ghilimeate) – caz de dialog neînchis
        const shouldNormalize =
          hasAnyQuotes ||
          (!!prevQuoted &&
            !!nextQuoted &&
            !prevQuoted.allLinesFullyWrapped &&
            !nextQuoted.allLinesFullyWrapped);

        if (shouldNormalize && subtitleLines.length > 0) {
          for (let k = 0; k < subtitleLines.length; k++) {
            const original = subtitleLines[k];
            const trimmed = original.trim();

            // Elimină doar ghilimelele de la margini (românești sau englezești)
            const inner = trimmed
              .replace(/^[„”"]/, '')
              .replace(/[„”"]$/, '');

            subtitleLines[k] = `"${inner}"`;
          }
        }

        // Adăugăm blocul în rezultat (număr + timestamp)
        result.push(lines[startIndex]);
        if (startIndex + 1 < lines.length) {
          result.push(lines[startIndex + 1]);
        }

        // Adăugăm liniile de text (modificate sau nu)
        let subtitleIndex = 0;
        for (let j = startIndex + 2; j <= endIndex; j++) {
          const line = lines[j];
          if (
            line &&
            line.trim() &&
            !/^\d{2}:\d{2}:\d{2},\d{3} --> \d{2}:\d{2}:\d{2},\d{3}$/.test(line.trim())
          ) {
            result.push(
              subtitleIndex < subtitleLines.length ? subtitleLines[subtitleIndex] : line,
            );
            subtitleIndex++;
          } else {
            result.push(line);
          }
        }

        i = endIndex + 1;
        currentBlockIndex++;
      } else {
        result.push(lines[i]);
        i++;
      }
    }

    return result.join('\n');
  };

  const formatNumber = (numStr: string): string => {
    // Dacă NU conține puncte și se termină cu 00 și reprezintă ani tipici (1800-2000), nu modifica
    if (!numStr.includes('.') && numStr.endsWith('00') && numStr.length === 4) {
      const year = parseInt(numStr);
      if (year >= 1800 && year <= 2000) {
        return numStr;
      }
    }

    // Pentru toate celelalte cazuri, formatează
    // Înlocuiește punctele cu spații mai întâi
    let formatted = numStr.replace(/\./g, ' ');

    // Obține toate cifrele fără spații
    const digitsOnly = formatted.replace(/\s/g, '');

    // Dacă are mai mult de 4 cifre SAU se termină cu 00 dar nu este an tipic, adaugă spații
    if (digitsOnly.length > 4 || (digitsOnly.endsWith('00') && digitsOnly.length === 4)) {
      formatted = digitsOnly.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    }

    return formatted;
  };

  const convertText = () => {
    let converted = sourceText;

    // Fix incomplete quotation marks first
    converted = fixIncompleteQuotationMarks(converted);

    // Înlocuiește diacritice românești cu virgulă în diacritice cu sedilă
    converted = converted.replace(/\u0219/g, '\u015F'); // ș mică cu virgulă (U+0219) → ș mică cu sedilă (U+015F)
    converted = converted.replace(/\u0218/g, '\u015E'); // Ș mare cu virgulă (U+0218) → Ș mare cu sedilă (U+015E)
    converted = converted.replace(/\u021B/g, '\u0163'); // ț mică cu virgulă (U+021B) → ț mică cu sedilă (U+0163)
    converted = converted.replace(/\u021A/g, '\u0162'); // Ț mare cu virgulă (U+021A) → Ț mare cu sedilă (U+0162)

    // Transformă ghilimele românești în ghilimele englezești
    converted = converted.replace(/\u201E/g, '"'); // ghilimele românești stânga (U+201E) → ghilimeaua englezească
    converted = converted.replace(/\u201D/g, '"'); // ghilimele românești dreapta (U+201D) → ghilimeaua englezească

    // Adaugă spațiu înainte de ? și ! dacă nu există deja
    converted = converted.replace(/([^ ])([?!])(?![?!])/g, '$1 $2');

    // Adaugă spațiu după "..." la începutul liniilor dacă nu există deja
    converted = converted.replace(/^\.\.\.([^\s])/gm, '... $1');

    // Formatează numerele (înlocuiește puncte cu spații și adaugă spații la numere mari)
    // Dar NU modifica numerele care sunt deasupra timestamp-urilor SRT (linii cu numere simple)
    converted = converted.replace(/\b\d+(?:\.\d+)*\b/g, (match, offset, string) => {
      // Verifică dacă numărul este la începutul liniei și urmează de timestamp SRT
      const lines = string.substring(0, offset + match.length).split('\n');
      const currentLine = lines[lines.length - 1];
      const lineStart = currentLine.match(/^\d+/);

      if (lineStart && lineStart[0] === match) {
        // Verifică dacă linia următoare conține un timestamp SRT
        const remainingText = string.substring(offset + match.length);
        const nextLines = remainingText.split('\n').slice(0, 2); // verifică următoarele 2 linii

        const hasTimestamp = nextLines.some((line: string) =>
          /^\d{2}:\d{2}:\d{2},\d{3} --> \d{2}:\d{2}:\d{2},\d{3}$/.test(line.trim())
        );

        if (hasTimestamp) {
          // Nu modifica numărul liniei de subtitrare
          return match;
        }
      }

      // Pentru toate celelalte numere, aplică formatarea
      return formatNumber(match);
    });

    setResultText(converted);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-4 text-gray-800">
          SubConvert
        </h1>

        <p className="text-center text-gray-600 mb-8 max-w-2xl mx-auto">
          Aplicatie simplă pentru conversia subtitrărilor SRT românești.
          Transformă diacriticele cu virgulă în diacritice cu sedilă (ș ț Ș Ț),
          corectează ghilimelele incomplete (adaugă ghilimele de închidere lipsă),
          convertește ghilimelele românești în ghilimele englezești,
          adaugă spații înainte de semnele de întrebare și exclamare,
          corectează spațierea după punctele de suspensie (...),
          și formatează numerele (înlocuiește punctele cu spații și adaugă spații la numere mari,
          cu excepția anilor tipici 1800-2000).
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
          {/* Caseta sursă */}
          <div className="space-y-4">
            <label className="block text-lg font-semibold text-gray-700">
              Text sursă (SRT)
            </label>
            <textarea
              value={sourceText}
              onChange={(e) => setSourceText(e.target.value)}
              placeholder="Lipește aici conținutul fișierului SRT..."
              className="w-full h-96 p-4 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
            />
          </div>

          {/* Buton și caseta rezultat */}
          <div className="space-y-4">
            <label className="block text-lg font-semibold text-gray-700">
              Text rezultat
            </label>
            <textarea
              value={resultText}
              readOnly
              placeholder="Rezultatul va apărea aici..."
              className="w-full h-96 p-4 border border-gray-300 rounded-lg resize-none bg-gray-50 font-mono text-sm"
            />
          </div>
        </div>

        {/* Buton centrat */}
        <div className="text-center mt-8">
          <button
            onClick={convertText}
            className="px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
          >
            Converteste
          </button>
        </div>
      </div>
    </div>
  );
}
