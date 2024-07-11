import * as vscode from "vscode";
import { parseStringPromise, Builder } from "xml2js";
import { sortedKeys, unsortedKeys } from "./sortConfig";

type Types = "primitive" | "array" | "undefined";

const ascertainDataType = (inputData: any): Types =>
  Array.isArray(inputData)
    ? "array"
    : typeof inputData !== "object" || inputData === null
    ? "primitive"
    : "undefined";

const createUniqueIdentifier = (
  fieldKey: string,
  fieldValue: any,
  keyMapping: any
): string => {
  const valueType = ascertainDataType(fieldValue);

  if (valueType === "primitive") {
    return `${fieldKey}:${
      fieldValue !== undefined ? fieldValue.toString() : ""
    }`;
  } else if (valueType === "array") {
    return `${fieldKey}:${fieldValue
      .map((item: any) => createUniqueIdentifier(fieldKey, item, keyMapping))
      .join()}`;
  } else {
    const mappedKeys = keyMapping?.[fieldKey] || Object.keys(fieldValue);
    return `${fieldKey}:${mappedKeys
      .map((relevantKey: string) =>
        createUniqueIdentifier(relevantKey, fieldValue[relevantKey], keyMapping)
      )
      .join("|")}`;
  }
};

const compareObjects = (
  a: any,
  b: any,
  key: string,
  mappedKeys: any
): number => {
  const aId = createUniqueIdentifier(key, a, mappedKeys);
  const bId = createUniqueIdentifier(key, b, mappedKeys);
  return aId < bId ? -1 : aId > bId ? 1 : 0;
};

const sortObject = (obj: any, options: any, key?: string): any => {
  const { mappedKeys = {}, unmappedKeys = [] } = options;

  if (unmappedKeys.includes(key)) {
    return obj;
  }

  const type = ascertainDataType(obj);
  if (type === "primitive") {
    return obj;
  } else if (type === "array") {
    return obj
      .map((item: any) => sortObject(item, options, key))
      .sort((a: any, b: any) => compareObjects(a, b, key!, mappedKeys));
  } else {
    const sortedKeys = Object.keys(obj).sort();
    const newObj: any = {};
    sortedKeys.forEach((k) => {
      newObj[k] = sortObject(obj[k], options, k);
    });
    return newObj;
  }
};

function getIndentationSpacesCount(xml: string) {
  const lines = xml.split("\n");
  for (const line of lines) {
    const trimmedLine = line.trim();
    if (trimmedLine.length === 0) {
      continue;
    }

    const leadingSpacesMatch = line.match(/^\s+/);
    if (leadingSpacesMatch) {
      const leadingWhitespace = leadingSpacesMatch[0];
      let spacesCount = (leadingWhitespace.match(/ /g) || []).length;
      let tabsCount = (leadingWhitespace.match(/\s/g) || []).length;
      if (spacesCount > 0) {
        tabsCount = 0;
      }
      return { spaces: spacesCount, tabs: tabsCount };
    }
  }
  return { spaces: 0, tabs: 0 };
}

function escapeXml(str: string) {
  let output = "";
  const replacementChars = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    // '"': "&quot;",  // I don't think we need to escape quotes?
    "'": "&apos;",
  };

  for (const [key, value] of Object.entries(replacementChars)) {
    str = str.replace(new RegExp(key, "g"), value);
  }
  

  const lines = str.split("\n");
  for (const line of lines) {
    let newLine = line;
    newLine = newLine.replace(/&lt;/g, "<");
    newLine = newLine.replace(/&gt;/g, ">");
    newLine = newLine.replace(/&gt;$/, ">");
    newLine = newLine.replace(/&lt;$/, "<");
    output += newLine + "\n";
  }

  return output;
}

export const formatSalesforceXML = async (
  xml: string,
  options: any
): Promise<string> => {
  const parsedXML = await parseStringPromise(xml);

  const { spaces, tabs } = getIndentationSpacesCount(xml);
  let indentation = spaces > 1 ? " ".repeat(spaces) : "\t".repeat(tabs);
  indentation = indentation || "    "; // if undef, 4 spaces

  const sortedXML = sortObject(parsedXML, options);
  const builder = new Builder({
    xmldec: {
      version: "1.0",
      encoding: "UTF-8",
    },
  });
  let formattedXML = builder.buildObject(sortedXML);
  formattedXML = formattedXML.replace(/  /g, indentation);
  formattedXML = escapeXml(formattedXML);

  return formattedXML;
};

export function activate(context: vscode.ExtensionContext) {
  let disposable = vscode.languages.registerDocumentFormattingEditProvider(
    "xml",
    {
      provideDocumentFormattingEdits: async (
        document: vscode.TextDocument
      ): Promise<vscode.TextEdit[]> => {
        const text = document.getText();
        const options = { mappedKeys: sortedKeys, unmappedKeys: unsortedKeys };

        try {
          const formattedXML = await formatSalesforceXML(text, options);
          const fullRange = new vscode.Range(
            document.positionAt(0),
            document.positionAt(text.length)
          );

          return [vscode.TextEdit.replace(fullRange, formattedXML)];
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error";
          vscode.window.showErrorMessage(
            "Error formatting XML: " + errorMessage
          );
          return [];
        }
      },
    }
  );

  context.subscriptions.push(disposable);
}

export function deactivate() {}
