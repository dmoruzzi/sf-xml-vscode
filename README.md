# Salesforce XML Beautifier

This extension formats Salesforce XML files more meaningfully to improve readability and minimize changes.

This extension is powered by the [xml2js](https://github.com/Leonidas-from-XIV/node-xml2js) library with some customizations to implement file-specific indentation requirements, special characters escaping, and a newline character at the end of the XML file.

## Algorithm

The sorting algorithm is custom comparator-based sort tailored for Salesforce XML files. This algorithm is inspired by the [SwagUp.sf-xml-formatter](https://github.com/swagup-com/sf-xml-formatter) sorting algorithm using a similar sorting approach.

### Overview

1. **Identify Type**: Determine if the input is a primitive value (number, string, etc.), an array, or an object.
2. **Generate Identifiers**:
   - For primitive values, convert the value to a string.
   - For arrays, recursively generate identifiers for each element and combine them into a single identifier.
   - For objects, recursively generate identifiers for each key-value pair, using a specified set of relevant keys if provided, and combine them into a single identifier.
3. **Custom Comparison**: Compare two elements by their generated identifiers to determine their sort order.
4. **Recursive Sorting**:
   - For arrays, recursively sort each element and then sort the array based on the custom comparison.
   - For objects, recursively sort the values of each key and create a new object with the sorted keys.
        - Sorted keys are defined in the `mappedKeys` option in the sortConfig.ts file.
        - Unsorted keys are defined in the `unmappedKeys` option in the sortConfig.ts file.

It also handles special characters in string values, such as apostrophes, which are escaped when formatted. The algorithm also inserts a newline characters at the end of the XML file.
