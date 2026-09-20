# ManakMitra — What Are We Actually Building?

## A simple explanation for the whole team

> **One-line explanation:**  
> **ManakMitra helps procurement officers find relevant Indian Standards for a tender requirement, understand the standards and their mapped relationships, assemble them into a tender specification, audit the specification for missing references, and find relevant BIS-recognised testing labs.**

The most important thing to understand is:

> **ManakMitra is not just a search engine for Indian Standards. It is a specification-assembly and verification workflow for procurement.**

---

# 1. What problem are we solving?

When a government department, PSU, procurement agency, or other organisation prepares an e-procurement tender, it needs to write a **technical specification** for the product or service being purchased.

That specification often needs to reference the relevant **Indian Standards (IS)**.

The difficult part is not simply finding a standard number.

A procurement officer may need to figure out:

- Which standards are relevant to the actual requirement?
- What does each standard cover?
- Which version/revision is associated with the available data?
- Does the standard have mapped allied/normative references?
- Are there associated test methods or safety references?
- Have important references been missed in the tender?
- Where can the resulting product potentially be tested?
- How can all of this be turned into a usable tender specification?

If this is done poorly, the tender can contain incomplete or ambiguous requirements, missed references, or outdated information.

The project context describes the core problem in exactly these terms: procurement teams have to deal with a large number of standards, overlapping scopes, revisions, and associated normative/allied standards. fileciteturn1file0L26-L33

---

# 2. The easiest way to understand ManakMitra

Forget the technology for a moment.

Imagine a procurement officer named **Ananya**.

She works in procurement for a public-sector organisation.

Her team needs to procure:

> **Electrical cables for an infrastructure project.**

She has to prepare the technical specification for the tender.

Her question is not:

> “What is IS 1234?”

Her real question is:

> **“Given what we are trying to procure, which Indian Standards should I consider, how are they related, and have I covered the necessary references in my tender?”**

That is the problem ManakMitra is designed to help with.

---

# 3. The user journey

## Step 1 — Ananya starts with the requirement

Instead of already knowing a standard number, Ananya describes what she needs.

For example:

> “Technical specifications for electrical cables for use in a public infrastructure project.”

She gives this requirement to ManakMitra.

### What ManakMitra does

The recommendation engine searches its indexed standards corpus and returns **ranked recommended standards**.

The important wording is:

> **Recommended standards**

not:

> **The correct standard**

The system deliberately avoids pretending that an AI recommendation is an unquestionable answer.

The live application currently has **337 standards** in the recommendation corpus. fileciteturn1file0L110-L127

---

# 4. Step 2 — She investigates a recommended standard

Ananya opens one of the recommended standards.

Instead of just seeing:

> IS XXXX — Some Standard

she gets a structured standard-detail view.

It can show:

- Scope
- Version and revision information
- Certification information
- Allied/normative standards
- Relevant nearby testing labs

This changes the workflow from:

> **Search → click result → leave**

to:

> **Search → understand → decide**

The standard-detail page is designed around exactly this flow. fileciteturn1file0L206-L211

---

# 5. Step 3 — She discovers related standards

This is one of the important parts of the product.

A standard may have mapped relationships to other standards.

For example, the available mapping can group relationships such as:

- Normative references
- Test methods
- Safety
- Terminology
- Installation/application

ManakMitra surfaces these relationships.

This matters because a procurement officer might otherwise find one relevant standard and stop there, while the tender may need to consider associated references.

### Important: not every standard has mapped allied references

This is intentional.

In the current data:

- **219 of 337** standards have at least one allied mapping.
- The remaining **131** deliberately show an empty state.

The application can therefore say:

> **No allied standards mapped for this entry.**

That is different from claiming:

> “No normative references exist anywhere.”

The first statement is supported by the application's available mapping; the second would be an overclaim.

fileciteturn1file0L129-L133

---

# 6. Step 4 — She starts building the tender

This is where the product's main idea becomes clear.

Ananya does not merely save search results.

She adds the relevant standard to the **Tender Builder**.

She can organise the tender into user-defined groups such as:

> Electrical Cables

When a standard is added, its mapped allied/normative standards are added by default, with the ability to deselect individual items.

So the workflow becomes:

**Requirement**

↓

**Recommended Standards**

↓

**Understand Standard**

↓

**Associated Standards**

↓

**Tender Specification**

The Tender Builder is therefore the **central artifact** of the application.

The project context explicitly describes this as the core product reframe: ManakMitra is a **spec-assembly tool**, not merely a search engine. fileciteturn1file0L35-L40

---

# 7. Step 5 — She audits the specification

Now Ananya has a draft specification.

Before finalising it, she can use:

> **Tender Audit**

She can paste/upload specification text or audit the current Tender Builder contents.

The audit analyses the specification clause by clause and looks for **missing normative references / citation coverage**.

This gives her another layer of protection:

> **“Did I miss an important reference while writing this specification?”**

Important limitation:

> The audit checks **citation coverage**, not whether the technical requirement itself is technically correct.

That distinction should always be maintained in our explanation and demo. fileciteturn1file0L221-L224

---

# 8. Step 6 — She finds testing labs

The procurement journey does not necessarily end with the specification.

Ananya may also need to know:

> **“Where can this kind of product be tested?”**

ManakMitra includes a directory of **431 BIS-recognised testing labs across 24 states**.

The directory supports filtering/search by things such as:

- State
- City
- Name
- Inferred speciality/category

The standard-detail page can also surface nearby/relevant labs based on category relevance and location.

fileciteturn1file0L135-L147

### Important accuracy point

The lab speciality/category matching is **derived/inferred data**, not official BIS accreditation scope.

The UI explicitly labels this.

So we should say:

> **“Relevant labs based on available category/location information.”**

rather than:

> “BIS officially certifies that this lab performs this exact test.”

---

# 9. Step 7 — She exports the result

Once Ananya has assembled and reviewed the tender specification, she can export it.

The application supports:

- **DOCX**
- **CSV**

The methodological caveats are also included in the exported document so that they do not disappear when the specification leaves the application. fileciteturn1file0L225-L227

---

# 10. So what does ManakMitra actually do?

In one flow:

```text
REAL PROCUREMENT REQUIREMENT
            ↓
   Describe the requirement
            ↓
     Recommended Standards
            ↓
     Understand the Standard
            ↓
  Find mapped related standards
            ↓
       Build the Tender
            ↓
      Audit the Tender
            ↓
     Find Relevant Labs
            ↓
         Export
```

Or, even shorter:

> **Find → Understand → Connect → Assemble → Audit → Act**

That is the product.

---

# 11. What ManakMitra is NOT

This is important because it will prevent confusion within the team.

### It is NOT simply:

> “Google for BIS standards.”

Search is only the first step.

### It is NOT:

> “An AI that tells you the one correct standard.”

It provides **recommendations** and deliberately avoids overstating certainty.

### It is NOT:

> “An AI that writes an entire technically correct tender from scratch.”

The current product helps assemble and audit **standard references and citation coverage**. It does not claim to validate every technical requirement.

### It is NOT:

> “An official BIS application.”

It is an **unofficial SIH 2026 prototype**, and the application explicitly identifies itself that way. fileciteturn1file0L20-L24

---

# 12. What happens behind the scenes?

Now forget Ananya for a moment.

Here is the technical explanation in simple terms.

## Frontend — what the user sees

The interface is built using:

- **React**
- **Vite**
- Plain **JavaScript / JSX**
- `react-router-dom` for navigation
- Custom CSS
- React Context + `useReducer` for application state

The tender itself is kept in the current browser session by design.

DOCX export is generated using:

- `docx`
- `file-saver`

fileciteturn1file0L44-L55

---

# 13. Backend — the brain behind the app

The backend is built with:

> **Python + FastAPI**

It is deployed as a **Docker Space on Hugging Face Spaces**.

The production setup is intentionally simple:

> **One deployed application → frontend + backend together**

FastAPI serves the built React frontend as static files and also exposes the API endpoints.

fileciteturn1file0L57-L62

---

# 14. How does the recommendation engine work?

This is the part the team should understand conceptually.

Suppose Ananya types:

> “Electrical cables for a public infrastructure project”

The system needs to figure out which standards are semantically relevant.

It uses a **hybrid retrieval system**.

In simple terms, it uses two complementary ways of searching:

### 1. Semantic / dense search

This tries to understand the **meaning** of the query.

So:

> “power transmission cable”

can potentially relate to a standard whose wording is not exactly the same.

### 2. Keyword / BM25 search

This looks for important words and exact textual matches.

So specific terms and terminology are not lost.

### 3. RRF — combining the results

The system combines these different rankings using **Reciprocal Rank Fusion (RRF)**.

So instead of relying entirely on:

> “Did the words match?”

or entirely on:

> “Did the meaning look similar?”

it combines both signals.

The project also has adaptive routing to improve paraphrase-style queries.

fileciteturn1file0L64-L67

---

# 15. What happens if the user types a standard number?

There is a special case.

If the user searches:

> **IS 456**

the system recognises that this looks like an exact standard identifier.

Instead of doing semantic search, it uses a deterministic **exact-identifier retrieval path**.

That means:

> `IS 456` → find the corresponding standard directly

This makes direct standard lookup more reliable.

fileciteturn1file0L68-L72

---

# 16. What about languages?

The backend also uses an **NLLB translation model** for query/content translation across 8 languages.

Conceptually:

```text
User's language
      ↓
Translation
      ↓
Recommendation / retrieval
      ↓
Relevant standards
```

There is currently an important distinction:

- **Query translation** is a backend capability.
- The deployed **UI-string multilingual system currently has a known issue** and is being worked on.

So in presentations, don't claim that the entire deployed UI is currently fully multilingual.

fileciteturn1file0L64-L73 fileciteturn1file0L173-L183

---

# 17. What data does the current prototype have?

This is important for understanding the current scope.

## Recommendation corpus

The live recommendation engine currently has:

> **337 standards**

Each record contains information such as:

- Standard number
- Title
- Scope
- Category
- Certification information
- QCO reference
- Publication year
- Latest-version field
- Amendment count
- Mandatory flag
- Source attribution

fileciteturn1file0L110-L127

### Why only 337?

The project has also collected metadata for a much larger BIS catalogue, but the larger dataset currently does **not** contain the scope/category information required to power the same semantic recommendation workflow.

So the larger catalogue is not simply interchangeable with the current recommendation corpus.

The full BIS catalogue work is still in progress. fileciteturn1file0L149-L169

---

# 18. The larger vision

The current 337-standard corpus is a **prototype-stage scope**, not the final vision.

The project context says that the longer-term direction includes:

- Expanding genuine scope-text coverage
- Correcting version/withdrawal discrepancies
- Periodically verifying information against the official BIS catalogue
- Increasing the coverage of the recommendation engine

fileciteturn1file0L266-L277

So when explaining the project, say:

> **“This is our working prototype of the workflow; the current corpus and capabilities are intentionally limited, and we are building toward broader coverage and verification.”**

That is much stronger than pretending the current prototype already covers every Indian Standard.

---

# 19. Why is the app designed to be cautious?

This is actually one of the strongest parts of the project.

The system deliberately follows:

> **Don't fabricate. Don't overclaim.**

For example:

### If there is no mapped allied standard

It shows an empty state.

### If a query is out of scope

The system can **abstain** instead of confidently inventing a recommendation.

### If a certification state is unknown

`Not determined` remains a valid neutral state.

### If the system is uncertain

It says **recommended standards**, rather than **the correct standard**.

### If the backend actually fails

The UI shows a real error instead of silently displaying fake demo data.

These are deliberate product decisions. fileciteturn1file0L241-L262

---

# 20. The whole project in very simple terms

If a teammate asks:

> **“Bro, what does our app actually do?”**

Give them this answer:

> **“Suppose a government procurement officer needs to buy electrical cables. She knows what she wants to buy, but she needs to write the tender using the relevant Indian Standards. ManakMitra lets her describe the requirement, recommends relevant standards, lets her inspect their scope and related standards, automatically brings mapped references into a Tender Builder, checks the resulting specification for missing citations, helps her find relevant BIS-recognised testing labs, and finally lets her export the specification.**
>
> **Behind the scenes, we use a hybrid search system that combines semantic similarity and keyword matching, with a separate exact-search path for standard numbers. FastAPI runs the backend, React runs the frontend, NLLB handles translation, and the application is deployed as a Docker Space on Hugging Face.**
>
> **So the core idea isn't 'AI searches BIS for you.' It's 'AI-assisted assembly and verification of the standards section of a procurement tender.'”**

---

# 21. The mental model the entire team should remember

### Don't think:

**User → Search → Standard**

### Think:

**Procurement Requirement**

↓

**Relevant Standards**

↓

**Standard Relationships**

↓

**Tender Specification**

↓

**Citation Audit**

↓

**Testing / Verification Ecosystem**

↓

**Export**

That is **ManakMitra**.

---

# 22. SIH problem-statement alignment

Our project context identifies ManakMitra as being built for **SIH26108** and frames the problem around helping procurement teams deal with Indian Standards while preparing tender specifications. fileciteturn1file0L20-L40

**Important:** you referred to the problem statement as **SIH260108** in your message, while the project context file consistently identifies it as **SIH26108**. I was not able to verify the exact 2026 problem-statement page from the publicly searchable SIH website during this check, so **please verify the official problem-statement ID/title from your SIH portal before putting the number into your final presentation/video.**

Based on the project context available to me, the current prototype is clearly aimed at the core workflow of:

> **Helping procurement users identify and work with relevant Indian Standards while assembling tender specifications, including associated references and citation checking.**

As you add more features, the important thing is to keep them connected to that central procurement workflow rather than turning the product into a generic standards-information portal.

---

# 23. One sentence for the presentation

> ### **ManakMitra is an AI-assisted procurement specification tool that helps users discover relevant Indian Standards, understand their relationships, assemble them into tender specifications, audit citation coverage, and connect the specification to relevant testing labs.**
