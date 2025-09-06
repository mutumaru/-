async function generatePokemon() {
  const type1 = document.getElementById("type1").value;
  const type2 = document.getElementById("type2").value;
  const image = document.getElementById("image").value;
  const other = document.getElementById("other").value;

  const response = await fetch("https://YOUR-VERCEL-APP.vercel.app/api/pokemon", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type1, type2, image, other }),
  });

  const data = await response.json();
  document.getElementById("result").textContent =
    data.result || data.error || "エラーが発生しました。";
}
