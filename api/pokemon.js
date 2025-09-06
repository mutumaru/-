// api/pokemon.js
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const { type1, type2, image, other } = req.body ?? {};
    // 作成するポケモンに関するプロンプト（LLMにJSONで返させるよう指示）
    const prompt = `
あなたはポケモンの公式図鑑を書けるAIです。以下の入力から「必ずJSON」で出力してください。
出力は厳密にJSONのみ、キーは必ず次の形式で与えてください:
{
  "name": "名前（6文字以内が望ましい）",
  "classification": "分類（例: でんげきポケモン）",
  "types": "タイプ1/タイプ2（タイプ2がなしならタイプ1のみ）",
  "height": "高さ（例: 0.7m）",
  "weight": "重さ（例: 9.1kg）",
  "ability": "特性名",
  "description": "図鑑説明（1〜3行程度）",
  "ability_description": "特性の簡潔なゲーム効果説明"
}

入力:
タイプ1: ${type1}
タイプ2: ${type2}
イメージ: ${image || "なし"}
その他: ${other || "なし"}

要点:
- 名前は日本語もOK。6文字以内を優先だが、メガ・フォーム等は例外可。
- 図鑑文と特性説明は分けること。
- 長い説明でなく、図鑑風の短めの文にすること。
`;

    // OpenAI 呼び出し（サーバー側で環境変数OPENAI_API_KEYにキーを入れておく）
    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 600,
        temperature: 0.9
      }),
    });

    const openaiJson = await openaiRes.json();

    // 生成テキスト（JSON文字列のはず）
    const content = openaiJson.choices?.[0]?.message?.content ?? null;
    if (!content) {
      console.error("OpenAI error:", openaiJson);
      res.status(500).json({ error: "OpenAI no content" });
      return;
    }

    // Try parse JSON; if fails, respond with raw text inside an error object
    let parsed = null;
    try {
      parsed = JSON.parse(content);
    } catch (e) {
      // 失敗したら、LLMが出したプレーンテキストをパースしやすくする試み:
      // まず、本文内にJSONらしき部分があれば抜き出す
      const match = content.match(/\{[\s\S]*\}/);
      if (match) {
        try { parsed = JSON.parse(match[0]); } catch (e2) { parsed = null; }
      }
    }

    if (!parsed) {
      // どうしてもパースできない場合は raw を返すのでフロント側で表示できる
      res.status(200).json({
        name: "生成失敗",
        classification: "—",
        types: `${type1}${type2 && type2 !== "なし" ? "/" + type2 : ""}`,
        height: "-",
        weight: "-",
        ability: "-",
        description: content.slice(0, 1000),
        ability_description: "(特性説明: raw)"
      });
      return;
    }

    // 成功したらそのまま返す
    res.status(200).json(parsed);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || "Server error" });
  }
}
