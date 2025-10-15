<p align="center">
  <table>
    <tr>
      <td align="center" bgcolor="white">
        <img src="assets/images/logo/logo.svg" alt="EVORA Project Logo" width="180" />
      </td>
      <td align="center" bgcolor="white">
        <img src="https://ictv.global/sites/default/files/inline-images/ictvLogo-head.png" alt="ICTV Logo" width="180" />
      </td>
    </tr>
  </table>
</p>

# ICTV Taxon Resolver

Lightweight showcase of the **public** [ICTV Ontology API](https://www.ebi.ac.uk/ols4/ontologies/ictv) developed within the [EVORA Project](https://evora-project.eu) in collaboration with the [International Committee on Taxonomy of Viruses (ICTV)](https://ictv.global/).  

👉 Live demo: [https://ictvapi.evora-project.eu](https://ictvapi.evora-project.eu)  


## 🌍 Overview
This simple static web interface demonstrates how the **public** ICTV API can resolve taxonomic terms and historical names.

It allows you to:
- Resolve ICTV taxon from an identifier, a former taxon name, a virus name, synonyms, or NCBI Taxon mappings
- Retrieve full ontology term details, including lineage
- Visualize relationships and term history

## 🔧 How it works
The resolver uses:
- **JavaScript ICTV API helper:** [ictv-api.js](https://cdn.jsdelivr.net/gh/EVORA-project/ictv-ontology/helpers/js/ictv-api.js) — lightweight utility for querying the ICTV API.
- **JavaScript UI:** [from this code repository ](https://github.com/EVORA-project/ictv-resolver/blob/main/ui.js)
- **Ontology source:** [ICTV Ontology](https://github.com/EVORA-project/ictv-ontology)
- **API Endpoint:** [OLS4 ICTV Ontology API](https://www.ebi.ac.uk/ols4/api/ontologies/ictv).
- **API Documentation:** [https://www.ebi.ac.uk/ols4/api-docs](https://www.ebi.ac.uk/ols4/api-docs)
- **Data license:** [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) — [International Committee on Taxonomy of Viruses (ICTV)](https://ictv.global/)

The interface is deployed via GitHub Pages.

## 🧩 Integration

If you want to use the ICTV API in your own project, simply include:

```html
<script src="https://cdn.jsdelivr.net/gh/EVORA-project/ictv-ontology/helpers/js/ictv-api.js"></script>
```

And then call:

```javascript
const api = new ICTVApi();
const result = await api.resolveToLatest('Zika virus');
console.log(result);
```

For more advanced usage, see [the helper documentation](https://github.com/EVORA-project/ictv-ontology/tree/main/helpers/js).

ℹ️ You can also clone this repository and adapt the UI directly for your use case.

---

## Disclaimer

This work was carried out within the [**EVORA Project**](https://evora-project.eu) – European Viral Outbreak Response Alliance – in collaboration with the [**ICTV**](https://ictv.global/).

Data sources © ICTV — [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)


