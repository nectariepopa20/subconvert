'use client';

import { useState } from 'react';

export default function Home() {
  const [sourceText, setSourceText] = useState('');
  const [resultText, setResultText] = useState('');

  const convertText = () => {
    let converted = sourceText;

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

    setResultText(converted);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8 text-gray-800">
          SubConvert
        </h1>

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
