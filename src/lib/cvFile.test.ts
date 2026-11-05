import { describe, expect, it } from "vitest";
import { docxText } from "./cvFile";

describe("docxText", () => {
  it("keeps paragraphs and decodes entities", () => {
    const xml =
      '<w:document><w:body><w:p><w:r><w:t>Nimali</w:t></w:r><w:r><w:t xml:space="preserve"> Perera</w:t></w:r></w:p><w:p><w:r><w:t>Tax &amp; audit</w:t></w:r><w:r><w:tab/><w:t>2020</w:t></w:r></w:p></w:body></w:document>';
    expect(docxText(xml)).toBe("Nimali Perera\nTax & audit\t2020");
  });
});
