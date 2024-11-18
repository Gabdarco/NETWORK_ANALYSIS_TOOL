// routes/index.js
const express = require("express");
const router = express.Router();
const fs = require("fs");
const path = require("path");
const scpClient = require("scp2");
const knex = require("knex")(require("../knexfile"));
require("dotenv").config();

// Import the database connection
const dbPromise = require("../db");
const { type } = require("os");

router.get("/", async (req, res) => {
  console.log("GET request received");

  // Define the query
  const query = `SELECT
  p.personID,
  p.firstName,
  p.middleName,
  p.lastName,
  p.suffix,
  p.biography,
  p.gender,
  p.birthDate,
  p.deathDate,
  p.last_prefix,
  p.LODwikiData,
  p.LODVIAF,
  p.LODLOC,
  p.first_prefix_id,
  p.last_prefix_id,
  p.suffix_id,
  p.language_id,
  p.personStdName,
  
  -- From person2document
  pd.docID AS documentID,
  d.importID,
  d.collection,
  d.abstract,
  d.sortingDate,
  d.letterDate,
  d.isJulian,
  d.researchNotes,
  d.customCitation,
  d.docTypeID,
  d.languageID AS documentLanguageID,
  d.repositoryID,
  d.dateAdded,
  d.status,
  d.whoCheckedOut,
  d.volume,
  d.page,
  d.folder,
  d.transcription,
  d.translation,
  d.virtual_doc,

  -- From person2occupation
  po.occupationID,
  po.dateSpan AS occupationDateSpan,
  po.uncertain AS occupationUncertain,
  ot.occupationDesc,

  -- From person2organization
  po2.organizationID,
  po2.dateSpan AS organizationDateSpan,
  po2.uncertain AS organizationUncertain,
  org.organizationName,
  org.formationDate,
  org.dissolutionDate,
  org.organizationLOD,

  -- From person2religion
  pr.religionID,
  pr.dateSpan AS religionDateSpan,
  pr.uncertain AS religionUncertain,
  r.religionDesc,

  -- From mentions
  m.documentID AS mentionDocumentID,
  m.placeID AS mentionPlaceID,
  m.keywordID AS mentionKeywordID,
  m.organizationID AS mentionOrganizationID,
  m.religionID AS mentionReligionID,
  m.dateStart AS mentionDateStart,
  m.comment AS mentionComment,
  m.person_uncertain AS mentionPersonUncertain,
  m.place_uncertain AS mentionPlaceUncertain,
  m.keyword_uncertain AS mentionKeywordUncertain,
  m.organization_uncertain AS mentionOrganizationUncertain,
  m.religion_uncertain AS mentionReligionUncertain,
  m.dateStart_uncertain AS mentionDateStartUncertain,
  m.dateFinish AS mentionDateFinish,
  m.dateFinish_uncertain AS mentionDateFinishUncertain,
  m.mentiontypeID,
  m.mentionNodeID,
  mt.mentionDesc,
  mn.comment AS mentionNodeComment,

  -- From relatedletters
  rl.relatedLetterID

FROM
  person p
LEFT JOIN person2document pd ON p.personID = pd.personID
LEFT JOIN document d ON pd.docID = d.documentID
LEFT JOIN person2occupation po ON p.personID = po.personID
LEFT JOIN occupationtype ot ON po.occupationID = ot.occupationtypeID
LEFT JOIN person2organization po2 ON p.personID = po2.personID
LEFT JOIN organization org ON po2.organizationID = org.organizationID
LEFT JOIN person2religion pr ON p.personID = pr.personID
LEFT JOIN religion r ON pr.religionID = r.religionID
LEFT JOIN mentions m ON p.personID = m.personID
LEFT JOIN mentiontype mt ON m.mentiontypeID = mt.mentiontypeID
LEFT JOIN mention_nodes mn ON m.mentionNodeID = mn.mentionNodeID
LEFT JOIN relatedletters rl ON p.personID = rl.documentID
`;

  try {
    const db = await dbPromise;
    const promisePool = db.promise();

    promisePool.query(query).then(([rows, fields]) => {
      res.json(rows);
    });
  } catch (error) {
    console.error("Failed to run query:", error);
    res.status(500).json({ error: "Failed to run query" });
    return;
  }
});

async function runQuery(query) {
  // Get the database connection
  const db = await dbPromise;
  const promisePool = db.promise();

  try {
    promisePool.query(query).then(([rows, fields]) => {
      return rows;
    });
  } catch (error) {
    console.error("Failed to run query:", error);
  } finally {
    if (db && db.end) {
      db.end();
    }
  }
}

//get all persons
router.get("/persons", async (req, res) => {
  console.log("GET request received");
  const query = `SELECT
	p.personID,
    CONCAT(p.firstName, " ", p.lastName) as fullName,
    p.firstName,
    p.middleName,
    p.lastName,
    p.maidenName,
    p.biography,
    p.gender,
    p.birthDate,
    p.deathDate,
    p.personStdName,
    GROUP_CONCAT(DISTINCT r.religionDesc) as religion,
    GROUP_CONCAT(DISTINCT l.languageDesc) as language,
    GROUP_CONCAT(DISTINCT o.organizationDesc) AS organization
  FROM
	  person p
  LEFT JOIN person2religion pr ON pr.personID = p.personID
  LEFT JOIN religion r ON r.religionID = pr.religionID
  LEFT JOIN language l on l.languageID = p.language_id
  LEFT JOIN person2organization p2org ON p.personID = p2org.personID
  LEFT JOIN organization o ON o.organizationID = p2org.organizationID
  GROUP BY p.personID`;
  try {
    const db = await dbPromise;
    const promisePool = db.promise();

    promisePool.query(query).then(([rows, fields]) => {
      res.json(rows);
    });
  } catch (error) {
    console.error("Failed to run query:", error);
    res.status(500).json({ error: "Failed to run query" });
    return;
  }
});

//search for specific document
router.get("/documents/:id", async (req, res) => {
  console.log("GET request received");
  const query = `SELECT * FROM document WHERE documentID = ${req.params.id}`;
  try {
    const db = await dbPromise;
    const promisePool = db.promise();

    promisePool.query(query).then(([rows, fields]) => {
      res.json(rows);
    });
  } catch (error) {
    console.error("Failed to run query:", error);
    res.status(500).json({ error: "Failed to run query" });
    return;
  }
});

//get person by name and wildcard search for uncomplete names
router.get("/persons/:name", async (req, res) => {
  console.log("GET request received");
  const query = `SELECT * FROM person WHERE firstName LIKE '${req.params.name}%' OR lastName LIKE '${req.params.name}%'`;
  try {
    const db = await dbPromise;
    const promisePool = db.promise();

    promisePool.query(query).then(([rows, fields]) => {
      res.json(rows);
    });
  } catch (error) {
    console.error("Failed to run query:", error);
    res.status(500).json({ error: "Failed to run query" });
    return;
  }
});

//get all connections between persons and documents and join sender and receiver based on documentID
router.get("/connections/:id", async (req, res) => {
  console.log("GET request received");

  const personID = req.params.id;

  //get all senders from person2document
  //get all receivers from those senders
  //organize by documentID and join sender and receiver
  const query = `
  SELECT
    p.personID AS senderID,
    CONCAT(p.firstName, ' ', p.lastName) AS sender,
    p.firstName AS senderFirstName,
    p.middleName AS senderMiddleName,
    p.lastName AS senderLastName,
    p.suffix AS senderSuffix,
    p.biography AS senderBiography,
    r.personID AS receiverID,
    CONCAT(r.firstName, ' ', r.lastName) AS receiver,  
    r.firstName AS receiverFirstName,
    r.middleName AS receiverMiddleName,
    r.lastName AS receiverLastName,
    r.suffix AS receiverSuffix,
    r.biography AS receiverBiography,
    pd.docID AS document,
    d.importID,
    d.collection,
    d.abstract,
    DATE_FORMAT(d.sortingDate, '%Y-%m-%d') AS date,
    d.letterDate,
    d.isJulian,
    d.researchNotes,
    d.customCitation,
    d.docTypeID,
    d.languageID AS documentLanguageID,
    d.repositoryID,
    d.dateAdded,
    d.status,
    d.whoCheckedOut,
    d.volume,
    d.page,
    d.folder,
    d.transcription,
    d.translation,
    d.virtual_doc,
    pdf.pdfURL
  FROM
    person p
  LEFT JOIN person2document pd ON p.personID = pd.personID
  LEFT JOIN document d ON pd.docID = d.documentID
  LEFT JOIN person2document pd2 ON pd2.docID = pd.docID
  LEFT JOIN person r ON pd2.personID = r.personID
  LEFT JOIN pdf_documents pdf ON d.documentID = pdf.documentID
  WHERE
    p.personID != r.personID 
  AND (p.personID = ? OR r.personID = ?)
  ORDER BY
    pd.docID`;

  try {
    const db = await dbPromise;
    const promisePool = db.promise();

    promisePool.query(query, [personID, personID]).then(([rows, fields]) => {
      res.json(rows);
    });
  } catch (error) {
    console.error("Failed to run query:", error);
    res.status(500).json({ error: "Failed to run query" });
    return;
  }
});

//get all documents sent and received by a person
router.get("/documents", async (req, res) => {
  console.log("GET request received");

  const query = `
  SELECT
        d.abstract,
        d.sortingDate,
        d.letterDate,
        d.researchNotes,
        d.customCitation,
        d.documentID,
        GROUP_CONCAT(DISTINCT pdf.pdfURL) AS pdfURL,
		GROUP_CONCAT(DISTINCT CONCAT(p.firstName, " ", p.lastName)) AS senders,
        GROUP_CONCAT(DISTINCT p.personID) as senderId,
        GROUP_CONCAT(DISTINCT p.firstName) as senderFirstName,
        GROUP_CONCAT(DISTINCT p.middleName) as senderMiddleName,
        GROUP_CONCAT(DISTINCT p.lastName) as senderLastName,
		GROUP_CONCAT(DISTINCT CONCAT(r.firstName, " ", r.lastName)) AS receivers,
        GROUP_CONCAT(DISTINCT r.personID) as receiverId,
        GROUP_CONCAT(DISTINCT r.firstName) as receiverFirstName,
        GROUP_CONCAT(DISTINCT r.middleName) as receiverMiddleName,
        GROUP_CONCAT(DISTINCT r.lastName) as receiverLastName,
        l.languageDesc
  FROM
    document d
  LEFT JOIN person2document pd ON pd.docID = d.documentID
  LEFT JOIN person p on p.personID = pd.personID
  LEFT JOIN person2document p2d ON p2d.docID = d.documentID
  LEFT JOIN person r on r.personID = p2d.personID
  LEFT JOIN pdf_documents pdf ON d.documentID = pdf.documentID
  LEFT JOIN language l ON d.languageID = l.languageID
  WHERE pd.roleID = 1 AND p2d.roleID = 2
  GROUP BY d.documentID
  ORDER BY d.documentID`;

  try {
    const db = await dbPromise;
    const promisePool = db.promise();

    promisePool
      .query(query)
      .then(([rows, fields]) => {
        res.json(rows);
      })
      .catch((error) => {
        console.error("Failed to run query:", error);
        res.status(500).json({ error: "Failed to run query" });
      });
  } catch (error) {
    console.error("Failed to run query:", error);
    res.status(500).json({ error: "Failed to run query" });
  }
});

router.get("/dates", async (req, res) => {
  console.log("GET request received");

  //get all senders from person2document
  //get all receivers from those senders
  //organize by documentID and join sender and receiver
  const query = `
  SELECT
    d.sortingDate AS date
  FROM
    person p
  LEFT JOIN person2document pd ON p.personID = pd.personID
  LEFT JOIN document d ON pd.docID = d.documentID
  LEFT JOIN person2document pd2 ON pd2.docID = pd.docID
  LEFT JOIN person r ON pd2.personID = r.personID
  WHERE
    p.personID != r.personID
  ORDER BY
    d.sortingDate DESC`;

  try {
    const db = await dbPromise;
    const promisePool = db.promise();

    promisePool.query(query).then(([rows, fields]) => {
      res.json(rows);
    });
  } catch (error) {
    console.error("Failed to run query:", error);
    res.status(500).json({ error: "Failed to run query" });
    return;
  }
});

//get all connections for religion
router.get("/connections/religion", async (req, res) => {
  console.log("GET request received");

  //get all people from person2religion

  const query = ``;

  try {
    const db = await dbPromise;
    const promisePool = db.promise();

    promisePool.query(query).then(([rows, fields]) => {
      res.json(rows);
    });
  } catch (error) {
    console.error("Failed to run query:", error);
    res.status(500).json({ error: "Failed to run query" });
    return;
  }
});

//get all connections for organization
router.get("/connections/organization", async (req, res) => {
  console.log("GET request received");

  //get all people from person2organization and specify what organization they are in
  const query = `
  SELECT
  p.personID,
  p.firstName,
  p.middleName,
  p.lastName,
  p.suffix,
  org.organizationName AS organization
FROM
  person p
  INNER JOIN person2organization po ON p.personID = po.personID
  INNER JOIN organization org ON po.organizationID = org.organizationID
  `;

  try {
    const db = await dbPromise;
    const promisePool = db.promise();

    promisePool.query(query).then(([rows, fields]) => {
      res.json(rows);
    });
  } catch (error) {
    console.error("Failed to run query:", error);
    res.status(500).json({ error: "Failed to run query" });
    return;
  }
});

// get all senders for sender filter in frontend
router.get("/senders", async (req, res) => {
  console.log("GET request received");

  //get all senders from person2document

  const query = `
  SELECT
  p.personID,
  p.firstName,
  p.middleName,
  p.lastName,
  p.suffix AS suffix,
  p.biography
FROM
  person p
  INNER JOIN person2document pd ON p.personID = pd.personID
  INNER JOIN document d ON pd.docID = d.documentID

  `;
  try {
    const db = await dbPromise;
    const promisePool = db.promise();

    promisePool.query(query).then(([rows, fields]) => {
      //format sender names as {sender: {name: 'John Doe', image: 'null'}}
      const senders = rows.map((row) => {
        return {
          name: `${row.firstName} ${row.lastName}`,
          image: "null",
        };
      });

      res.json(senders);
    });
  } catch (error) {
    console.error("Failed to run query:", error);
    res.status(500).json({ error: "Failed to run query" });
    return;
  }
});

// get all receivers for receiver filter in frontend
router.get("/receivers", async (req, res) => {
  console.log("GET request received");

  //get all receivers from person2document

  const query = `
  SELECT
  p.personID,
  p.firstName,
  p.middleName,
  p.lastName,
  p.suffix AS suffix,
  p.biography
FROM

  person p
  INNER JOIN person2document pd ON p.personID = pd.personID
  INNER JOIN document d ON pd.docID = d.documentID
  INNER JOIN person2document pd2 ON pd2.docID = d.documentID
  INNER JOIN person r ON pd2.personID = r.personID
  WHERE
    p.personID != r.personID

  `;
  try {
    const db = await dbPromise;
    const promisePool = db.promise();

    promisePool.query(query).then(([rows, fields]) => {
      const receivers = rows.map((row) => {
        return {
          name: `${row.firstName} ${row.lastName}`,
          image: "null",
        };
      });
      res.json(receivers);
    });
  } catch (error) {
    console.error("Failed to run query:", error);
    res.status(500).json({ error: "Failed to run query" });
    return;
  }
});

router.get("/sender_receiver", async (req, res) => {
  console.log("GET request received");

  const query = `
  SELECT
    sender.personID AS senderID,
    CONCAT(sender.firstName, ' ', sender.lastName) AS senderName,
    sender.firstName AS senderFirstName,
    sender.middleName AS senderMiddleName,
    sender.lastName AS senderLastName,
    sender.suffix AS senderSuffix,
    sender.biography AS senderBiography,
    receiver.personID AS receiverID,
    CONCAT(receiver.firstName, ' ', receiver.lastName) AS receiverName,
    receiver.firstName AS receiverFirstName,
    receiver.middleName AS receiverMiddleName,
    receiver.lastName AS receiverLastName,
    receiver.suffix AS receiverSuffix,
    receiver.biography AS receiverBiography,
    pd.docID AS documentID,
    d.importID,
    d.collection,
    d.abstract,
    DATE_FORMAT(d.sortingDate, '%Y-%m-%d') AS date,
    d.letterDate,
    d.isJulian,
    d.researchNotes,
    d.customCitation,
    d.docTypeID,
    d.languageID AS documentLanguageID,
    d.repositoryID,
    d.dateAdded,
    d.status,
    d.whoCheckedOut,
    d.volume,
    d.page,
    d.folder,
    d.transcription,
    d.translation,
    d.virtual_doc,
    pdf.pdfURL
  FROM
    person sender
  LEFT JOIN person2document pd ON sender.personID = pd.personID
  LEFT JOIN document d ON pd.docID = d.documentID
  LEFT JOIN person2document pd2 ON pd2.docID = d.documentID
  LEFT JOIN person receiver ON pd2.personID = receiver.personID
  LEFT JOIN pdf_documents pdf ON d.documentID = pdf.documentID
  WHERE
    sender.personID != receiver.personID
  ORDER BY
    pd.docID    `;

  try {
    const db = await dbPromise;
    const promisePool = db.promise();

    promisePool
      .query(query)
      .then(([rows, fields]) => {
        const relation = rows.map((row) => {
          return {
            sender: {
              id: row.senderID,
              name: row.senderName,
              firstName: row.senderFirstName,
              middleName: row.senderMiddleName,
              lastName: row.senderLastName,
              suffix: row.senderSuffix,
              biography: row.senderBiography,
              image: "null",
            },
            receiver: {
              id: row.receiverID,
              name: row.receiverName,
              firstName: row.receiverFirstName,
              middleName: row.receiverMiddleName,
              lastName: row.receiverLastName,
              suffix: row.receiverSuffix,
              biography: row.receiverBiography,
              image: "null",
            },
            document: {
              id: row.documentID,
              importID: row.importID,
              collection: row.collection,
              abstract: row.abstract,
              date: row.date,
              letterDate: row.letterDate,
              isJulian: row.isJulian,
              researchNotes: row.researchNotes,
              customCitation: row.customCitation,
              docTypeID: row.docTypeID,
              documentLanguageID: row.documentLanguageID,
              repositoryID: row.repositoryID,
              dateAdded: row.dateAdded,
              status: row.status,
              whoCheckedOut: row.whoCheckedOut,
              volume: row.volume,
              page: row.page,
              folder: row.folder,
              transcription: row.transcription,
              translation: row.translation,
              virtual_doc: row.virtual_doc,
              pdfURL: row.pdfURL,
            },
          };
        });
        res.json(relation);
      })
      .catch((error) => {
        console.error("Failed to run query:", error);
        res.status(500).json({ error: "Failed to run query" });
      });
  } catch (error) {
    console.error("Failed to run query:", error);
    res.status(500).json({ error: "Failed to run query" });
  }
});

// Helper function to capitalize the first letter of each word
function capitalizeName(name) {
  if (!name) return "";
  return name
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

// This is the relations route
// It will gather all the nodes and edges for the graph
// The nodes will come from the person and organization tables
// The edges will come from the person2document, person2organization, person2religion, and relationship tables
// The edges will be between the person and the document, organization, religion, or another person
// Each node will store all the person's or organization's information
// The query will use joins to get all the information needed
router.post("/relations", async (req, res) => {
  console.log(req.body);

  const query = `
    SELECT
      -- Select person details
      p.personID AS id,
      p.firstName,
      p.middleName,
      p.lastName,
      CONCAT(p.firstName, ' ', p.lastName) AS fullName,
      p.suffix,
      p.biography,
      p.gender,
      p.birthDate,
      p.deathDate,
      p.last_prefix,
      p.LODwikiData,
      p.LODVIAF,
      p.LODLOC,
      p.first_prefix_id,
      p.last_prefix_id,
      p.suffix_id,
      p.language_id,
      p.personStdName,
      'person' AS nodeType,
      NULL AS documentID,
      NULL AS importID,
      NULL AS collection,
      NULL AS abstract,
      NULL AS letterDate,
      NULL AS isJulian,
      NULL AS researchNotes,
      NULL AS customCitation,
      NULL AS docTypeID,
      NULL AS documentLanguageID,
      NULL AS repositoryID,
      NULL AS dateAdded,
      NULL AS status,
      NULL AS whoCheckedOut,
      NULL AS volume,
      NULL AS page,
      NULL AS folder,
      NULL AS transcription,
      NULL AS translation,
      NULL AS virtual_doc,
      NULL AS organizationID,
      NULL AS religionID,
      NULL AS organizationName,
      NULL AS formationDate,
      NULL AS dissolutionDate,
      NULL AS organizationLOD,
      NULL AS religionDesc,
      NULL AS senderFullName,
      NULL AS receiverFullName,
      NULL AS date
    FROM person p
    UNION
    SELECT
      -- Select person to document relationship details and sender/receiver information
      p2d.personID AS id,
      p.firstName,
      p.middleName,
      p.lastName,
      CONCAT(p.firstName, ' ', p.lastName) AS fullName,
      p.suffix,
      p.biography,
      p.gender,
      p.birthDate,
      p.deathDate,
      p.last_prefix,
      p.LODwikiData,
      p.LODVIAF,
      p.LODLOC,
      p.first_prefix_id,
      p.last_prefix_id,
      p.suffix_id,
      p.language_id,
      p.personStdName,
      'document' AS nodeType,
      d.documentID,
      d.importID,
      d.collection,
      d.abstract,
      d.letterDate,
      d.isJulian,
      d.researchNotes,
      d.customCitation,
      d.docTypeID,
      d.languageID AS documentLanguageID,
      d.repositoryID,
      d.dateAdded,
      d.status,
      d.whoCheckedOut,
      d.volume,
      d.page,
      d.folder,
      d.transcription,
      d.translation,
      d.virtual_doc,
      NULL AS organizationID,
      NULL AS religionID,
      NULL AS organizationName,
      NULL AS formationDate,
      NULL AS dissolutionDate,
      NULL AS organizationLOD,
      NULL AS religionDesc,
      -- Subqueries to get sender and receiver full names using GROUP_CONCAT
      (SELECT GROUP_CONCAT(CONCAT(p1.firstName, ' ', p1.lastName) SEPARATOR ', ')
       FROM person2document p2d1
       JOIN person p1 ON p2d1.personID = p1.personID
       WHERE p2d1.docID = d.documentID AND p2d1.roleID = 1) AS senderFullName,
      (SELECT GROUP_CONCAT(CONCAT(p2.firstName, ' ', p2.lastName) SEPARATOR ', ')
       FROM person2document p2d2
       JOIN person p2 ON p2d2.personID = p2.personID
       WHERE p2d2.docID = d.documentID AND p2d2.roleID = 2) AS receiverFullName,
      DATE_FORMAT(d.sortingDate, '%Y-%m-%d') AS date
    FROM person2document p2d
    JOIN person p ON p2d.personID = p.personID
    JOIN document d ON p2d.docID = d.documentID
    UNION
    SELECT
      -- Select person to organization relationship details
      p2o.personID AS id,
      p.firstName,
      p.middleName,
      p.lastName,
      CONCAT(p.firstName, ' ', p.lastName) AS fullName,
      p.suffix,
      p.biography,
      p.gender,
      p.birthDate,
      p.deathDate,
      p.last_prefix,
      p.LODwikiData,
      p.LODVIAF,
      p.LODLOC,
      p.first_prefix_id,
      p.last_prefix_id,
      p.suffix_id,
      p.language_id,
      p.personStdName,
      'organization' AS nodeType,
      NULL AS documentID,
      NULL AS importID,
      NULL AS collection,
      NULL AS abstract,
      NULL AS letterDate,
      NULL AS isJulian,
      NULL AS researchNotes,
      NULL AS customCitation,
      NULL AS docTypeID,
      NULL AS documentLanguageID,
      NULL AS repositoryID,
      NULL AS dateAdded,
      NULL AS status,
      NULL AS whoCheckedOut,
      NULL AS volume,
      NULL AS page,
      NULL AS folder,
      NULL AS transcription,
      NULL AS translation,
      NULL AS virtual_doc,
      p2o.organizationID AS organizationID,
      NULL AS religionID,
      NULL AS organizationName,
      NULL AS formationDate,
      NULL AS dissolutionDate,
      NULL AS organizationLOD,
      NULL AS religionDesc,
      NULL AS senderFullName,
      NULL AS receiverFullName,
      NULL AS date
    FROM person2organization p2o
    JOIN person p ON p2o.personID = p.personID
    UNION
    SELECT
      -- Select person to religion relationship details
      p2r.personID AS id,
      p.firstName,
      p.middleName,
      p.lastName,
      CONCAT(p.firstName, ' ', p.lastName) AS fullName,
      p.suffix,
      p.biography,
      p.gender,
      p.birthDate,
      p.deathDate,
      p.last_prefix,
      p.LODwikiData,
      p.LODVIAF,
      p.LODLOC,
      p.first_prefix_id,
      p.last_prefix_id,
      p.suffix_id,
      p.language_id,
      p.personStdName,
      'religion' AS nodeType,
      NULL AS documentID,
      NULL AS importID,
      NULL AS collection,
      NULL AS abstract,
      NULL AS letterDate,
      NULL AS isJulian,
      NULL AS researchNotes,
      NULL AS customCitation,
      NULL AS docTypeID,
      NULL AS documentLanguageID,
      NULL AS repositoryID,
      NULL AS dateAdded,
      NULL AS status,
      NULL AS whoCheckedOut,
      NULL AS volume,
      NULL AS page,
      NULL AS folder,
      NULL AS transcription,
      NULL AS translation,
      NULL AS virtual_doc,
      NULL AS organizationID,
      p2r.religionID AS religionID,
      NULL AS organizationName,
      NULL AS formationDate,
      NULL AS dissolutionDate,
      NULL AS organizationLOD,
      NULL AS religionDesc,
      NULL AS senderFullName,
      NULL AS receiverFullName,
      NULL AS date
    FROM person2religion p2r
    JOIN person p ON p2r.personID = p.personID
    UNION
    SELECT
      -- Select organization details
      o.organizationID AS id,
      NULL AS firstName,
      NULL AS middleName,
      NULL AS lastName,
      NULL AS fullName,
      NULL AS suffix,
      NULL AS biography,
      NULL AS gender,
      NULL AS birthDate,
      NULL AS deathDate,
      NULL AS last_prefix,
      NULL AS LODwikiData,
      NULL AS LODVIAF,
      NULL AS LODLOC,
      NULL AS first_prefix_id,
      NULL AS last_prefix_id,
      NULL AS suffix_id,
      NULL AS language_id,
      NULL AS personStdName,
      'organization' AS nodeType,
      NULL AS documentID,
      NULL AS importID,
      NULL AS collection,
      NULL AS abstract,
      NULL AS letterDate,
      NULL AS isJulian,
      NULL AS researchNotes,
      NULL AS customCitation,
      NULL AS docTypeID,
      NULL AS documentLanguageID,
      NULL AS repositoryID,
      NULL AS dateAdded,
      NULL AS status,
      NULL AS whoCheckedOut,
      NULL AS volume,
      NULL AS page,
      NULL AS folder,
      NULL AS transcription,
      NULL AS translation,
      NULL AS virtual_doc,
      NULL AS organizationID,
      NULL AS religionID,
      o.organizationName,
      o.formationDate,
      o.dissolutionDate,
      o.organizationLOD,
      NULL AS religionDesc,
      NULL AS senderFullName,
      NULL AS receiverFullName,
      NULL AS date
    FROM organization o
    UNION
    SELECT
      -- Select religion details
      r.religionID AS id,
      NULL AS firstName,
      NULL AS middleName,
      NULL AS lastName,
      NULL AS fullName,
      NULL AS suffix,
      NULL AS biography,
      NULL AS gender,
      NULL AS birthDate,
      NULL AS deathDate,
      NULL AS last_prefix,
      NULL AS LODwikiData,
      NULL AS LODVIAF,
      NULL AS LODLOC,
      NULL AS first_prefix_id,
      NULL AS last_prefix_id,
      NULL AS suffix_id,
      NULL AS language_id,
      NULL AS personStdName,
      'religion' AS nodeType,
      NULL AS documentID,
      NULL AS importID,
      NULL AS collection,
      NULL AS abstract,
      NULL AS letterDate,
      NULL AS isJulian,
      NULL AS researchNotes,
      NULL AS customCitation,
      NULL AS docTypeID,
      NULL AS documentLanguageID,
      NULL AS repositoryID,
      NULL AS dateAdded,
      NULL AS status,
      NULL AS whoCheckedOut,
      NULL AS volume,
      NULL AS page,
      NULL AS folder,
      NULL AS transcription,
      NULL AS translation,
      NULL AS virtual_doc,
      NULL AS organizationID,
      r.religionID AS religionID,
      NULL AS organizationName,
      NULL AS formationDate,
      NULL AS dissolutionDate,
      NULL AS organizationLOD,
      r.religionDesc AS religionDesc,
      NULL AS senderFullName,
      NULL AS receiverFullName,
      NULL AS date
    FROM religion r
    UNION
    SELECT
      -- Select relationship details
      rel.relationshipID AS id,
      NULL AS firstName,
      NULL AS middleName,
      NULL AS lastName,
      NULL AS fullName,
      NULL AS suffix,
      NULL AS biography,
      NULL AS gender,
      NULL AS birthDate,
      NULL AS deathDate,
      NULL AS last_prefix,
      NULL AS LODwikiData,
      NULL AS LODVIAF,
      NULL AS LODLOC,
      NULL AS first_prefix_id,
      NULL AS last_prefix_id,
      NULL AS suffix_id,
      NULL AS language_id,
      NULL AS personStdName,
      'relationship' AS nodeType,
      NULL AS documentID,
      NULL AS importID,
      NULL AS collection,
      NULL AS abstract,
      NULL AS letterDate,
      NULL AS isJulian,
      NULL AS researchNotes,
      NULL AS customCitation,
      NULL AS docTypeID,
      NULL AS documentLanguageID,
      NULL AS repositoryID,
      NULL AS dateAdded,
      NULL AS status,
      NULL AS whoCheckedOut,
      NULL AS volume,
      NULL AS page,
      NULL AS folder,
      NULL AS transcription,
      NULL AS translation,
      NULL AS virtual_doc,
      NULL AS organizationID,
      NULL AS religionID,
      NULL AS organizationName,
      NULL AS formationDate,
      NULL AS dissolutionDate,
      NULL AS organizationLOD,
      NULL AS religionDesc,
      NULL AS senderFullName,
      NULL AS receiverFullName,
      NULL AS date
    FROM relationship rel;
  `;

  try {
    const db = await dbPromise;
    const promisePool = db.promise();

    promisePool
      .query(query)
      .then(([rows, fields]) => {
        const nodes = [];
        const edges = [];

        rows.forEach((row) => {
          let node = nodes.find(
            (n) => n.id === row.id && n.nodeType === row.nodeType
          );
          if (!node) {
            node = {
              id: row.id,
              firstName: capitalizeName(row.firstName),
              middleName: capitalizeName(row.middleName),
              lastName: capitalizeName(row.lastName),
              fullName: capitalizeName(row.fullName),
              suffix: row.suffix,
              biography: row.biography,
              gender: row.gender,
              birthDate: row.birthDate,
              deathDate: row.deathDate,
              last_prefix: row.last_prefix,
              LODwikiData: row.LODwikiData,
              LODVIAF: row.LODVIAF,
              LODLOC: row.LODLOC,
              first_prefix_id: row.first_prefix_id,
              last_prefix_id: row.last_prefix_id,
              suffix_id: row.suffix_id,
              language_id: row.language_id,
              personStdName: row.personStdName,
              nodeType: row.nodeType,
              organizationName: row.organizationName,
              formationDate: row.formationDate,
              dissolutionDate: row.dissolutionDate,
              organizationLOD: row.organizationLOD,
              religionDesc: row.religionDesc,
              documents: [],
            };
            nodes.push(node);
          }

          if (row.documentID) {
            edges.push({
              from: row.id,
              to: row.documentID,
              type: "document",
              abstract: row.abstract,
              letterDate: row.letterDate,
              isJulian: row.isJulian,
              researchNotes: row.researchNotes,
              customCitation: row.customCitation,
              docTypeID: row.docTypeID,
              documentLanguageID: row.documentLanguageID,
              repositoryID: row.repositoryID,
              dateAdded: row.dateAdded,
              status: row.status,
              whoCheckedOut: row.whoCheckedOut,
              volume: row.volume,
              page: row.page,
              folder: row.folder,
              transcription: row.transcription,
              translation: row.translation,
              virtual_doc: row.virtual_doc,
              senderFullName: row.senderFullName,
              receiverFullName: row.receiverFullName,
              documentID: row.documentID,
              date: row.date,
            });
          } else if (row.organizationID) {
            edges.push({
              from: row.id,
              to: row.organizationID,
              type: "organization",
              organizationName: row.organizationName,
              formationDate: row.formationDate,
              dissolutionDate: row.dissolutionDate,
              organizationLOD: row.organizationLOD,
            });
          } else if (row.religionID) {
            edges.push({
              from: row.id,
              to: row.religionID,
              type: "religion",
              religionDesc: row.religionDesc,
              religionID: row.religionID,
            });
          } else if (row.relationshipID) {
            edges.push({
              from: row.person1ID,
              to: row.person2ID,
              type: "relationship",
              relationship1to2ID: row.relationship1to2ID,
              relationship2to1ID: row.relationship2to1ID,
              uncertain: row.uncertain,
              relationshipType: row.relationshipType,
              relationshipDesc: row.relationshipDesc,
            });
          }
        });

        // Extract minDate and maxDate from the request body
        const { person, minDate, maxDate } = req.body;

        // Check if the request body is empty
        if (!person || person.length === 0) {
          // If the request body is empty, return all nodes and edges
          // console.log(edges);
          return res.json({ nodes, edges });
        }

        // Filter edges based on the names passed in the body
        const filteredEdges = edges.filter(
          (edge) =>
            person.includes(edge.senderFullName?.toLowerCase()) ||
            person.includes(edge.receiverFullName?.toLowerCase())
        );

        // Filter edges based on the date range
        const dateFilteredEdges = filteredEdges.filter((edge) => {
          const edgeDate = new Date(edge.date);
          const min = new Date(minDate);
          const max = new Date(maxDate);
          return edgeDate >= min && edgeDate <= max;
        });

        // Collect all names from the filtered edges
        const connectedNames = new Set();
        dateFilteredEdges.forEach((edge) => {
          if (edge.senderFullName) {
            edge.senderFullName
              .split(", ")
              .forEach((name) => connectedNames.add(name.toLowerCase()));
          }
          if (edge.receiverFullName) {
            edge.receiverFullName
              .split(", ")
              .forEach((name) => connectedNames.add(name.toLowerCase()));
          }
        });

        // Filter nodes based on the collected names
        const filteredNodes = nodes.filter((node) =>
          connectedNames.has(node.fullName.toLowerCase())
        );

        // console.log(filteredEdges);
        res.json({ nodes: filteredNodes, edges: dateFilteredEdges });
      })
      .catch((error) => {
        console.error("Failed to run query:", error);
        res.status(500).json({ error: "Failed to run query" });
      });
  } catch (error) {
    console.error("Failed to run query:", error);
    res.status(500).json({ error: "Failed to run query" });
  }
});

router.get("/receivers", async (req, res) => {
  console.log("GET request received");

  //get all receivers from person2document

  const query = `
  SELECT
  p.personID,
  p.firstName,
  p.middleName,
  p.lastName,
  p.suffix AS suffix,
  p.biography
FROM

  person p
  INNER JOIN person2document pd ON p.personID = pd.personID
  INNER JOIN document d ON pd.docID = d.documentID
  INNER JOIN person2document pd2 ON pd2.docID = d.documentID
  INNER JOIN person r ON pd2.personID = r.personID
  WHERE
    p.personID != r.personID

  `;
  try {
    const db = await dbPromise;
    const promisePool = db.promise();

    promisePool.query(query).then(([rows, fields]) => {
      const receivers = rows.map((row) => {
        return {
          name: `${row.firstName} ${row.lastName}`,
          image: "null",
        };
      });
      res.json(receivers);
    });
  } catch (error) {
    console.error("Failed to run query:", error);
    res.status(500).json({ error: "Failed to run query" });
    return;
  }
});

router.get("/base_query", async (req, res) => {
  console.log("GET request received");
  try {
    const db = await dbPromise;
    const promisePool = db.promise();

    // Create an array of queries to fetch data from each table
    const queries = [
      "SELECT * FROM person",
      "SELECT * FROM keyword",
      "SELECT * FROM organization",
      "SELECT * FROM occupationtype",
      "SELECT * FROM place",
      "SELECT * FROM relationshiptype",
      "SELECT * FROM religion",
      "SELECT * FROM repository",
      "SELECT * FROM role",
    ];

    // Execute all queries in parallel
    const results = await Promise.all(
      queries.map((query) => promisePool.query(query))
    );

    // Structure the data into a JSON object
    const [
      person,
      keyword,
      organizationtype,
      occupation,
      place,
      relationshiptype,
      religion,
      repositorie,
      role,
    ] = results.map(([rows]) => rows);

    const result = {
      person,
      keyword,
      organizationtype,
      occupation,
      place,
      relationshiptype,
      religion,
      repositorie,
      role,
    };

    // Send the JSON response
    res.json(result);
  } catch (error) {
    console.error("Error fetching data:", error);
    res.status(500).send("Internal Server Error");
  }
});

router.get("/documents", async (req, res) => {
  const people = `
  select
  *
  from
  person;
  `;

  const documents = `
  select
  *
  from
  document;
  `;

  const connections = `
  select
  *
  from
  person2document
  `;

  try {
    const db = await dbPromise;
    const promisePool = db.promise();

    const peopleResults = await promisePool.query(people);
    const documentResults = await promisePool.query(documents);
    const connectionResults = await promisePool.query(connections);

    const peopleArr = peopleResults[0];
    const documentsArr = documentResults[0];
    const connectionsArr = connectionResults[0];

    const edges = [];
    const nodes = [];

    //an edge consists of two rows from the connections table
    //each row represents a connection between a person and a document
    //one row represents the sender and the other represents the receiver of the document
    //the edge is between the sender and the receiver
    //sender and receiver are determined by the roleID column in the connections table
    //roleID = 1 is the sender
    //roleID = 2 is the receiver
    //sender and receivers are nodes in the graph
    //each node has a unique personID
    //each edge has a unique documentID
    connectionsArr.forEach((connection) => {
      const documentID = connection.docID;
      const document = documentsArr.find(
        (doc) => doc.documentID === documentID
      );

      if (connection.roleID === 1) {
        const sender = peopleArr.find(
          (person) => person.personID === connection.personID
        );
        nodes.push(sender);
      } else if (connection.roleID === 2) {
        const receiver = peopleArr.find(
          (person) => person.personID === connection.personID
        );
        nodes.push(receiver);
      }
      //check to see if the document exists in the edges array
      //if it does not exist, add it to the edges array
      //else add the sender/reciever to the edges array
      //edge object consists of the sender and receiver and the documentID
      const edge = edges.find(
        (edge) => edge.document.documentID === documentID
      );

      if (!edge) {
        edges.push({
          document: document,
          sender: connection.roleID === 1 ? connection.personID : null,
          receiver: connection.roleID === 2 ? connection.personID : null,
        });
      } else {
        if (connection.roleID === 1) {
          edge.sender = connection.personID;
        } else if (connection.roleID === 2) {
          edge.receiver = connection.personID;
        }
      }
    });

    //filter out edges that do not have a sender or receiver

    const filteredEdges = edges.filter((edge) => edge.sender && edge.receiver);

    res.json({ filteredEdges, nodes });
  } catch (error) {
    console.error("Error fetching data:", error);
    res.status(500).send("Internal Server Error");
  }
});

//Get all documents for the gallery using document view
router.get("/gallery/docs", async (req, res) => {
  console.log("GET request received");

  const query = `
  SELECT *
  FROM document_all_view;
  `;

  try {
    const db = await dbPromise;
    const promisePool = db.promise();

    promisePool.query(query).then(([rows, fields]) => {
      const documents = rows.map((row) => {
        return {
          documentID: row.documentID,
          importID: row.importID,
          collection: row.collection,
          abstract: row.abstract,
          letterDate: row.letterDate,
          sortingDate: row.sortingDate,
          isJulian: row.isJulian,
          researchNotes: row.researchNotes,
          customCitation: row.customCitation,
          docTypeID: row.docTypeID,
          documentLanguageID: row.documentLanguageID,
          repositoryID: row.repositoryID,
          dateAdded: row.dateAdded,
          status: row.status,
          whoCheckedOut: row.whoCheckedOut,
          volume: row.volume,
          page: row.page,
          folder: row.folder,
          transcription: row.transcription,
          translation: row.translation,
          virtual_doc: row.virtual_doc,
          dbNotes: row.dbNotes,
          person2DocID: row.person2DocID,
          personRole: row.personRole,
          roleDesc: row.roleDesc,
          author: row.author,
          authorFirstName: row["Author First Name"],
          authorMiddleName: row["Author Middle Name"],
          authorLastName: row["Author Last Name"],
          person2Role: row.person2Role,
          receiver: row.receiver,
          receiverFirstName: row["Receiver First Name"],
          receiverMiddleName: row["Receiver Middle Name"],
          receiverLastName: row["Receiver Last Name"],
          authorStdName: row.authorStdName,
          receiverStdName: row.receiverStdName,
          organization2DocID: row.organization2DocumnetID,
          organizationID: row.organizationID,
          organization: row.organizationDesc,
          organizationRole: row.orgRole,
          internalPDFname: row.internalPDFname,
        };
      });
      return res.json(documents);
    });
  } catch (error) {
    console.error("Failed to run query:", error);
    res.status(500).json({ error: "Failed to run query" });
    return;
  }
});

router.get("/religion", async (req, res) => {
  const people = `
  select
  *
  from
  person;
  `;

  const religions = `
  select
  *
  from
  religion;
  `;

  const connections = `
  select
  *
  from
  person2religion
  `;

  try {
    const db = await dbPromise;
    const promisePool = db.promise();

    const peopleResults = await promisePool.query(people);
    const religionResults = await promisePool.query(religions);
    const connectionResults = await promisePool.query(connections);

    const peopleArr = peopleResults[0];
    const religionsArr = religionResults[0];
    const connectionsArr = connectionResults[0];

    const edges = [];
    const nodes = [];

    connectionsArr.forEach((connection) => {
      const religionID = connection.religionID;
      const religion = religionsArr.find(
        (religion) => religion.religionID === religionID
      );

      const person = peopleArr.find(
        (person) => person.personID === connection.personID
      );
      nodes.push(person);

      const edge = edges.find((edgeI) => {
        edgeI.religion.religionID === religionID;
      });

      edges.push({
        religion: religion,
        person: connection.personID,
      });
    });

    //if the person does not have a religion, remove the person from the nodes array
    const filteredNodes = nodes.filter((node) => {
      if (
        connectionsArr.find(
          (connection) => connection.personID === node.personID
        )
      ) {
        return node;
      }
    });

    //add the religion to the nodes array
    religionsArr.forEach((religion) => {
      filteredNodes.push(religion);
    });

    res.json({ edges, filteredNodes });
  } catch (error) {
    console.error("Error fetching data:", error);
    res.status(500).send("Internal Server Error");
  }
});

router.get("/organization", async (req, res) => {
  const people = `
  select
  *
  from
  person;
  `;

  const organizations = `
  select
  *
  from
  organization;
  `;

  const connections = `
  select
  *
  from
  person2organization
  `;

  try {
    const db = await dbPromise;
    const promisePool = db.promise();

    const peopleResults = await promisePool.query(people);
    const organizationResults = await promisePool.query(organizations);
    const connectionResults = await promisePool.query(connections);

    const peopleArr = peopleResults[0];
    const organizationsArr = organizationResults[0];
    const connectionsArr = connectionResults[0];

    const edges = [];
    const nodes = [];

    connectionsArr.forEach((connection) => {
      const organizationID = connection.organizationID;
      const organization = organizationsArr.find(
        (organization) => organization.organizationID === organizationID
      );

      const person = peopleArr.find(
        (person) => person.personID === connection.personID
      );
      nodes.push(person);

      const edge = edges.find((edgeI) => {
        edgeI.organization.organizationID === organizationID;
      });

      edges.push({
        organization: organization,
        person: connection.personID,
      });
    });

    //if the person does not exist in the connections array, remove the person from the nodes array
    const filteredNodes = nodes.filter((node) => {
      if (
        connectionsArr.find(
          (connection) => connection.personID === node.personID
        )
      ) {
        return node;
      }
    });

    //add the organization to the nodes array
    organizationsArr.forEach((organization) => {
      filteredNodes.push(organization);
    });

    res.json({ edges, filteredNodes });
  } catch (error) {
    console.error("Error fetching data:", error);
    res.status(500).send("Internal Server Error");
  }
});

router.post("/graph", async (req, res) => {
  const peopleQuery = `
    SELECT *
    FROM person;
  `;

  const documentsQuery = `
      SELECT a.*, b.*, DATE_FORMAT(a.sortingDate, '%Y-%m-%d') AS date FROM document a, 
  pdf_documents b where a.documentID = b.documentID;
    `;

  const documentConnectionsQuery = `
    SELECT *
    FROM person2document;
  `;

  const religionsQuery = `
    SELECT *
    FROM religion;
  `;

  const religionConnectionsQuery = `
    SELECT *
    FROM person2religion;
  `;

  const organizationsQuery = `
    SELECT *
    FROM organization;
  `;

  const organizationConnectionsQuery = `
    SELECT *
    FROM person2organization;
  `;

  const mentionsQuery = `
    SELECT 
    mn.mentionNodeID,
    mn.comment AS mentionNodeComment,
    mn.dbNotes,
    mn.mentionImportID,
    mn.documentID AS mentionNodeDocumentID,
    mn.mentiontypeID AS mentionNodeMentiontypeID,
    m.mentionID,
    m.documentID AS mentionDocumentID,
    m.personID,
    m.placeID,
    m.keywordID,
    m.organizationID,
    m.religionID,
    m.dateStart,
    m.comment AS mentionComment,
    m.person_uncertain,
    m.place_uncertain,
    m.keyword_uncertain,
    m.organization_uncertain,
    m.religion_uncertain,
    m.dateStart_uncertain,
    m.dateFinish,
    m.dateFinish_uncertain,
    m.mentiontypeID AS mentionMentiontypeID,
    m.mentionNodeID AS mentionMentionNodeID
FROM 
    mention_nodes mn
JOIN 
    mentions m 
ON 
    mn.mentionNodeID = m.mentionNodeID;
  `;

  const relationshipsQuery = `
SELECT 
    r.relationshipID,
    r.person1ID,
    r.person2ID,
    COALESCE(rt1.relationshipDesc, 'Unknown') AS relationship1to2Desc,
    COALESCE(rt2.relationshipDesc, 'Unknown') AS relationship2to1Desc,
    r.dateStart,
    r.dateEnd,
    r.uncertain,
    r.dateEndCause,
    r.relationship1to2ID,
    r.relationship2to1ID
FROM 
    relationship r
LEFT JOIN
   relationshiptype rt1 ON r.relationship1to2ID = rt1.relationshiptypeID
 left JOIN
    relationshiptype rt2 ON r.relationship2to1ID = rt2.relationshiptypeID
   where person1ID != person2ID
         order by relationshipID
         limit 270
         ;
   
  
  `;

  try {
    const db = await dbPromise;
    const promisePool = db.promise();

    const [peopleResults] = await promisePool.query(peopleQuery);
    const [documentResults] = await promisePool.query(documentsQuery);
    const [documentConnectionResults] = await promisePool.query(
      documentConnectionsQuery
    );
    const [religionResults] = await promisePool.query(religionsQuery);
    const [religionConnectionResults] = await promisePool.query(
      religionConnectionsQuery
    );
    const [organizationResults] = await promisePool.query(organizationsQuery);
    const [organizationConnectionResults] = await promisePool.query(
      organizationConnectionsQuery
    );
    const [mentionResults] = await promisePool.query(mentionsQuery);
    const [relationshipResults] = await promisePool.query(relationshipsQuery);

    const peopleArr = peopleResults;
    const documentsArr = documentResults;
    const documentConnectionsArr = documentConnectionResults;
    const religionsArr = religionResults;
    const religionConnectionsArr = religionConnectionResults;
    const organizationsArr = organizationResults;
    const organizationConnectionsArr = organizationConnectionResults;
    const mentionsArr = mentionResults;
    const relationshipsArr = relationshipResults;

    const edges = [];
    const nodes = [];

    // Helper function to generate a unique ID based on node type and ID
    const generateUniqueId = (type, id) => `${type}_${id}`;

    // Create a map for person nodes to easily update their documents array
    const personNodeMap = new Map();

    // Create nodes for people
    peopleArr.forEach((person) => {
      const uniqueId = generateUniqueId("person", person.personID);
      const personNode = {
        person: {
          ...person,
          fullName: `${person.firstName} ${person.lastName}`,
        },
        nodeType: "person",
        id: uniqueId,
        documents: [],
        relations: [],
        mentions: [],
      };
      nodes.push(personNode);
      personNodeMap.set(uniqueId, personNode);
    });

    // Create nodes for documents
    documentsArr.forEach((document) => {
      const uniqueId = generateUniqueId("document", document.documentID);
      nodes.push({ document, nodeType: "document", id: uniqueId });
    });

    // Ensure each religion node is unique by checking religionID before adding
    religionsArr.forEach((religion) => {
      const uniqueId = generateUniqueId("religion", religion.religionID);
      const existingNode = nodes.find(
        (node) => node.id === uniqueId && node.nodeType === "religion"
      );
      if (!existingNode) {
        nodes.push({ religion, nodeType: "religion", id: uniqueId });
      }
    });

    // Create nodes for organizations
    organizationsArr.forEach((organization) => {
      const uniqueId = generateUniqueId(
        "organization",
        organization.organizationID
      );
      nodes.push({ organization, nodeType: "organization", id: uniqueId });
    });

    documentConnectionsArr.forEach((connection) => {
      const documentId = generateUniqueId("document", connection.docID);
      const document = documentsArr.find(
        (doc) => generateUniqueId("document", doc.documentID) === documentId
      );

      if (connection.roleID === 1) {
        // Sender
        const senderId = generateUniqueId("person", connection.personID);

        // Find the existing edge for the document where 'from' is null (i.e., sender not assigned)
        const edge = edges.find(
          (edge) => edge.document.documentID === connection.docID && !edge.from
        );

        if (edge) {
          edge.from = senderId; // Update the 'from' field for sender
        } else {
          edges.push({
            document,
            from: senderId,
            to: null, // Initially null as we may not know receiver yet
            type: "document",
          });
        }

        // Update the sender's documents array
        const senderNode = personNodeMap.get(senderId);
        if (
          senderNode &&
          !senderNode.documents.some(
            (doc) => doc.document.documentID === document.documentID
          )
        ) {
          //get the receiver of the document
          const receiverID = documentConnectionsArr.find(
            (connection) =>
              connection.docID === document.documentID &&
              connection.roleID === 2
          );
          const receiver = peopleArr.find(
            (person) => person.personID === receiverID?.personID
          );

          receiverFullName = `${receiver?.firstName} ${receiver?.lastName}`;
          senderNode.documents.push({
            document: {
              ...document,
              sender: senderNode.person.fullName,
              receiver: receiverFullName,
            },
          });
        }
      } else if (connection.roleID === 2) {
        // Receiver
        const receiverId = generateUniqueId("person", connection.personID);

        // Find the edge that has the documentID and either has no 'to' or no 'from' (because sender might not be known yet)
        const edge = edges.find(
          (edge) =>
            edge.document.documentID === connection.docID &&
            (!edge.to || !edge.from)
        );

        if (edge) {
          edge.to = receiverId; // Update the 'to' field for receiver
        } else {
          edges.push({
            document,
            from: null, // Initially null as we may not know sender yet
            to: receiverId,
            type: "document",
          });
        }

        // Update the receiver's documents array
        const receiverNode = personNodeMap.get(receiverId);
        if (
          receiverNode &&
          !receiverNode.documents.some(
            (doc) => doc.document.documentID === document.documentID
          )
        ) {
          //get the sender of the document
          const senderID = documentConnectionsArr.find(
            (connection) =>
              connection.docID === document.documentID &&
              connection.roleID === 1
          );
          const sender = peopleArr.find(
            (person) => person.personID === senderID?.personID
          );
          const senderFullName = `${sender?.firstName} ${sender?.lastName}`;
          receiverNode.documents.push({
            document: {
              ...document,
              sender: senderFullName,
              receiver: receiverNode.person.fullName,
            },
          });
        }
      } else if (connection.roleID === 3) {
        // Mentioned
        const mentionedId = generateUniqueId("person", connection.personID);
        edges.push({
          document,
          // From author node to mentioned person node
          from: documentId,
          to: mentionedId,
          type: "mentioned",
        });

        // Update the mentioned person's documents array
        const mentionedNode = personNodeMap.get(mentionedId);
        if (
          mentionedNode &&
          !mentionedNode.documents.some(
            (doc) => doc.document.documentID === document.documentID
          )
        ) {
          mentionedNode.documents.push({ document, role: "Mentioned" });
        }
      } else if (connection.roleID === 4) {
        // Author
        const authorId = generateUniqueId("person", connection.personID);
        edges.push({
          document,
          // From author node to whoever receives the document
          from: authorId,
          to: documentId,
          type: "author",
        });

        // Update the author's documents array
        const authorNode = personNodeMap.get(authorId);
        if (
          authorNode &&
          !authorNode.documents.some(
            (doc) => doc.document.documentID === document.documentID
          )
        ) {
          authorNode.documents.push({ document, role: "Author" });
        }
      } else if (connection.roleID === 5) {
        // Waypoint
        const waypointId = generateUniqueId("person", connection.personID); // Generate the waypoint person node ID

        // Find the edge that has the documentID and either no 'from' or 'to' (i.e., sender or receiver might not be known yet)
        const edge = edges.find(
          (edge) =>
            edge.document.documentID === connection.docID &&
            (!edge.from || !edge.to)
        );

        // If the edge exists, update the 'to' field with the waypoint person ID
        if (edge) {
          edge.to = waypointId;
        } else {
          // If the edge does not exist, create a new edge with the waypoint person ID
          edges.push({
            document,
            from: null, // Initially null as sender might not be known yet
            to: waypointId,
            type: "document",
          });
        }

        // Update the waypoint person's node to include the document in their documents array
        const waypointNode = personNodeMap.get(waypointId);
        if (
          waypointNode &&
          !waypointNode.documents.some(
            (doc) => doc.document.documentID === document.documentID
          )
        ) {
          waypointNode.documents.push({
            document,
            sender: null,
            waypoint: waypointNode.person,
          });
        }
      }
    });

    relationshipsArr.forEach((relationship) => {
      // Check if both person1ID and person2ID are not null
      if (relationship.person1ID && relationship.person2ID) {
        const relationshipId = generateUniqueId(
          "relationship",
          relationship.relationshipID
        );
        const person1Id = generateUniqueId("person", relationship.person1ID);
        const person2Id = generateUniqueId("person", relationship.person2ID);

        const edge = edges.find(
          (edge) => edge.from === person1Id && edge.to === person2Id
        );

        edges.push({
          from: person1Id,
          to: person2Id,
          type: "relationship",
          relationship1to2Desc: relationship.relationship1to2Desc || "Unknown",
          relationship2to1Desc: relationship.relationship2to1Desc || "Unknown",
          dateStart: relationship.dateStart || "N/A",
          dateEnd: relationship.dateEnd || "N/A",
        });
      }
    });

    // Process mentions
    mentionsArr.forEach((mention) => {
      const mentionPersonId = generateUniqueId("person", mention.personID);
      const mentionReligionId = generateUniqueId(
        "religion",
        mention.religionID
      );
      const mentionOrganizationId = generateUniqueId(
        "organization",
        mention.organizationID
      );
      const mentionDocumentId = generateUniqueId(
        "document",
        mention.documentID
      ); // Mentioned document

      const personNode = nodes.find((node) => node.id === mentionPersonId);
      const religionNode = nodes.find((node) => node.id === mentionReligionId);
      const organizationNode = nodes.find(
        (node) => node.id === mentionOrganizationId
      );

      // Add mention to person node if it exists
      if (personNode) {
        personNode.mentions.push({
          ...mention,
        });
      }

      // Add mention to religion node if it exists
      if (religionNode) {
        religionNode.mentions.push({
          ...mention,
        });
      }

      // Add mention to organization node if it exists
      if (organizationNode) {
        organizationNode.mentions.push({
          ...mention,
        });
      }
    });

    // Create edges for people to religions (with from/to fields and type)
    religionConnectionsArr.forEach((connection) => {
      const religionId = generateUniqueId("religion", connection.religionID);
      const personId = generateUniqueId("person", connection.personID);
      edges.push({
        from: personId, // From person node
        to: religionId, // To religion node
        type: "religion",
      });
    });

    // Create edges for people to organizations (with from/to fields and type)
    organizationConnectionsArr.forEach((connection) => {
      const organizationId = generateUniqueId(
        "organization",
        connection.organizationID
      );
      const personId = generateUniqueId("person", connection.personID);
      edges.push({
        from: personId, // From person node
        to: organizationId, // To organization node
        type: "organization",
      });
    });

    // Filter out edges where 'from' or 'to' is null
    const filteredEdges = edges.filter(
      (edge) => edge.from !== null && edge.to !== null
    );

    res.json({
      edges: filteredEdges,
      nodes,
      elength: filteredEdges.length,
      nlength: nodes.length,
    });
  } catch (error) {
    console.error("Error fetching data:", error);
    res.status(500).send("Internal Server Error");
  }
});

//get everything associated with a person just how the graph is storing an individual person
//get by the personID
router.get("/person/:personID", async (req, res) => {
  const personID = req.params.personID;
  const personQuery = `
    SELECT
    p.personID,
    p.biography,
    CONCAT(p.firstName, ' ', p.lastName) AS fullName,
    p.gender,
    p.birthDate,
    p.deathDate,
    p.LODLOC,
    p.LODwikiData,
    p.LODVIAF
    FROM
    person p
    WHERE
    p.personID = ${personID};
  `;

  const documentQuery = `
SELECT d.*, 
GROUP_CONCAT(pdf.internalPDFname) AS internalPDFname,
GROUP_CONCAT(pdf.pdfDesc) AS pdfDesc,
GROUP_CONCAT(pdf.pdfURL) AS pdfURL,
GROUP_CONCAT(pdf.pdfID) AS pdfID,
GROUP_CONCAT(DISTINCT CONCAT(sender.firstName, " ", sender.lastName)) AS sender,
GROUP_CONCAT(DISTINCT CONCAT(receiver.firstName, " ", receiver.lastName)) AS receiver,
DATE_FORMAT(d.sortingDate, '%Y-%m-%d') AS date 
FROM document d
LEFT JOIN pdf_documents pdf ON pdf.documentID = d.documentID
LEFT JOIN person2document p2d ON p2d.docID = d.documentID AND (p2d.roleID = 1 OR p2d.roleID = 4)
LEFT JOIN person sender ON p2d.personID = sender.personID
LEFT JOIN person2document p2d2 ON p2d2.docID = d.documentID AND p2d2.roleID = 2
LEFT JOIN person receiver ON p2d2.personID = receiver.personID
WHERE sender.personID = ${personID} OR receiver.personID = ${personID}
GROUP BY d.documentID;
  `;

  const religionQuery = `
    SELECT *
    FROM religion r
    LEFT JOIN person2religion p2r ON p2r.religionID = r.religionID
    WHERE p2r.personID = ${personID};
  `;

  const organizationQuery = `
    SELECT 
      GROUP_CONCAT(DISTINCT o.organizationID) as organizationID,
    GROUP_CONCAT(DISTINCT o.organizationDesc) AS orgranization
    FROM organization o
    LEFT JOIN person2organization p2org ON p2org.organizationID = o.organizationID
    WHERE p2org.personID = ${personID}
    GROUP BY p2org.personID
  `;

  const mentionQuery = `
    SELECT 
    mn.mentionNodeID,
    mn.comment AS mentionNodeComment,
    mn.dbNotes,
    mn.mentionImportID,
    mn.documentID AS mentionNodeDocumentID,
    mn.mentiontypeID AS mentionNodeMentiontypeID,
    m.mentionID,
    m.documentID AS mentionDocumentID,
    m.personID,
    m.placeID,
    m.keywordID,
    m.organizationID,
    m.religionID,
    m.dateStart,
    m.comment AS mentionComment,
    m.person_uncertain,
    m.place_uncertain,
    m.keyword_uncertain,
    m.organization_uncertain,
    m.religion_uncertain,
    m.dateStart_uncertain,
    m.dateFinish,
    m.dateFinish_uncertain,
    m.mentiontypeID AS mentionMentiontypeID,
    m.mentionNodeID AS mentionMentionNodeID
FROM
    mention_nodes mn
JOIN
    mentions m
ON
    mn.mentionNodeID = m.mentionNodeID
WHERE
    m.personID = ${personID};
  `;

  const relationshipQuery = `

  SELECT
      r.relationshipID,
      r.person1ID,
      CONCAT(p1.firstName, ' ', p1.lastName) AS person1,
      r.person2ID,
      CONCAT(p2.firstName, ' ', p2.lastName) AS person2,
      COALESCE(rt1.relationshipDesc, 'Unknown') AS relationship1to2Desc,
      COALESCE(rt2.relationshipDesc, 'Unknown') AS relationship2to1Desc,
      r.dateStart,
      r.dateEnd,
      r.uncertain,
      r.dateEndCause,
      r.relationship1to2ID,
      r.relationship2to1ID
    FROM
      relationship r
    LEFT JOIN
      relationshiptype rt1 ON r.relationship1to2ID = rt1.relationshiptypeID
    LEFT JOIN
      relationshiptype rt2 ON r.relationship2to1ID = rt2.relationshiptypeID
    LEFT JOIN
    person p1 ON r.person1ID = p1.personID
    LEFT JOIN
    person p2 ON r.person2ID = p2.personID
    WHERE
    r.person1ID = ${personID} OR r.person2ID = ${personID}
    ORDER BY relationshipID;
  `;

  try {
    const db = await dbPromise;
    const promisePool = db.promise();

    const [personResults] = await promisePool.query(personQuery);
    const [documentResults] = await promisePool.query(documentQuery);
    const [religionResults] = await promisePool.query(religionQuery);
    const [organizationResults] = await promisePool.query(organizationQuery);
    const [mentionResults] = await promisePool.query(mentionQuery);
    const [relationshipResults] = await promisePool.query(relationshipQuery);

    const person = personResults;
    const documents = documentResults;
    const religion = religionResults[0];
    const organization = organizationResults[0];
    const mentions = mentionResults;
    const relations = relationshipResults.map((rel) => ({ relationship: rel }));

    console.log("Person:", person);

    const personNode = {
      person,
      documents,
      religion,
      organization,
      mentions,
      relations,
    };

    res.json(personNode);
  } catch (error) {
    console.error("Error fetching data:", error);
    res.status(500).send("Internal Server Error");
  }
});
const sshConfig = {
  host: process.env.DB_HOST,
  username: process.env.DB_SSH_USER,
  password: process.env.DB_SSH_PASSWORD,
  port: 22,
};

router.get("/pdf/:pdfName", (req, res) => {
  const pdfName = req.params.pdfName;
  const localPdfPath = path.join(__dirname, `../public/pdf/${pdfName}`);
  const remotePdfPath = `/home/print/print_na/pdf_documents/${pdfName}`;

  // Check if the PDF exists locally
  if (fs.existsSync(localPdfPath)) {
    return res.sendFile(localPdfPath);
  } else {
    return res.status(404).send("PDF not found");
  }

  // Download the PDF from the remote server
  scpClient.scp(
    {
      host: sshConfig.host,
      username: sshConfig.username,
      password: sshConfig.password, // Use privateKey for SSH key-based auth
      path: remotePdfPath,
    },
    localPdfPath,
    function (err) {
      if (err) {
        return res
          .status(500)
          .send("Error downloading the file from the remote server.");
      }

      // Send the file to the client after it has been downloaded
      res.sendFile(localPdfPath);
    }
  );
});

router.get("/personFullName/:id", async (req, res) => {
  const personId = req.params.id;

  const personQuery = `
    SELECT CONCAT(firstName, ' ', lastName) AS fullName
    FROM person
    WHERE personID = ${personId};
  `;

  try {
    const db = await dbPromise;
    const promisePool = db.promise();

    const [personResults] = await promisePool.query(personQuery);

    if (personResults.length > 0) {
      res.json(personResults[0]);
    } else {
      res.status(404).send("Person not found");
    }
  } catch (error) {
    console.error("Error fetching data:", error);
    res.status(500).send("Internal Server Error");
  }
});

router.post("/query", async (req, res) => {
  const getBool = (bool) => {
    switch (bool) {
      case "Equals":
        return "=";
      case "Not Equals":
        return "!=";
      case "Greater Than":
        return ">";
      case "Less Than":
        return "<";
      case "Greater Than or Equal To":
        return ">=";
      case "Less Than or Equal To":
        return "<=";
      default:
        return bool.toUpperCase();
    }
  };

  const getField = (field) => {
    switch (field) {
      case "First Name":
        return "firstName";
      case "Middle Name":
        return "middleName";
      case "Last Name":
        return "lastName";
      case "Person":
        return "personStdName";
      case "Place":
        return "placeStdName";
      case "Keyword":
        return "keyword";
      case "Organization":
        return "organizationDesc";
      case "Occupation":
        return "occupationDesc";
      case "Religion":
        return "religionDesc";
      case "Relationship":
        return "relationshipDesc";
      case "Repository":
        return "repositoryName";
      default:
        return field;
    }
  };

  console.log("POST request received");
  const query = req.body.query;
  let sql = "";
  const personQuery = `SELECT * FROM (SELECT
	  p.personID,
    CONCAT(COALESCE(CONCAT(p.firstName, " "), ""), COALESCE(CONCAT(p.middleName, " "), "" ), COALESCE(p.lastName, "")) AS fullName,
    p.firstName,
    p.middleName,
    p.lastName,
    p.maidenName,
    p.biography,
    p.gender,
    p.birthDate,
    p.deathDate,
    p.personStdName,
    r.religionDesc,
    l.languageDesc,
    ot.occupationDesc,
    o.organizationDesc
  FROM
	  person p
  LEFT JOIN person2religion pr ON pr.personID = p.personID
  LEFT JOIN religion r ON r.religionID = pr.religionID
  LEFT JOIN language l ON l.languageID = p.language_id
  LEFT JOIN person2occupation p2o ON p.personID = p2o.personID
  LEFT JOIN occupationtype ot ON p2o.occupationID = ot.occupationtypeID
  LEFT JOIN person2organization porg ON porg.personID = p.personID
  LEFT JOIN organization o on o.organizationID = porg.organizationID
  ORDER BY p.personID) AS sum`;
  const documentQuery = `SELECT * FROM (	
    SELECT
		d.documentID,
		d.abstract,
        d.sortingDate,
        d.letterDate,
        d.isJulian,
        d.researchNotes,
		GROUP_CONCAT(DISTINCT dt.typeDesc) AS docType,
        GROUP_CONCAT(DISTINCT l.languageDesc) AS language,
        GROUP_CONCAT(DISTINCT rep.repoDesc) as repository,
        GROUP_CONCAT(DISTINCT CONCAT(COALESCE(CONCAT(author.firstName, " "), ""), COALESCE(CONCAT(author.middleName, " "), ""), COALESCE(author.lastName, ""))) AS authors,
        GROUP_CONCAT(DISTINCT CONCAT(COALESCE(CONCAT(receiver.firstName, " "), ""), COALESCE(CONCAT(receiver.middleName, " "), ""), COALESCE(receiver.lastName, ""))) AS receivers
	FROM
		document d
	LEFT JOIN documenttype dt ON d.docTypeID = dt.docTypeID
    LEFT JOIN language l ON d.languageID = l.languageID
    LEFT JOIN repository rep ON rep.repoID = d.repositoryID
    LEFT JOIN person2document p2da ON p2da.docID = d.documentID AND (p2da.roleID = 4 OR p2da.roleID = 1)
    LEFT JOIN person author ON p2da.personID = author.personID
	LEFT JOIN person2document p2dr ON p2dr.docID = d.documentID AND p2dr.roleID = 2
    LEFT JOIN person receiver ON p2dr.personID = receiver.personID
    GROUP BY d.documentID
) AS doc`;
  switch (req.body.table) {
    case "Person":
      sql += personQuery;
      break;
    case "Document":
      sql += documentQuery;
      break;
    case "Place":
      sql += "SELECT * FROM place";
      break;
    default:
      return;
  }
  if (
    query.length != 0 &&
    query[0].field !== undefined &&
    query[0].bool !== undefined &&
    query[0].value !== undefined
  ) {
    sql += " WHERE ";
    const bool = getBool(query[0].bool);
    const field = getField(query[0].field);
    sql += `${field} ${bool} \"${query[0].value}\"`;

    for (var i = 1; i < query.length; i++) {
      if (query[i].and) sql += " AND ";
      else sql += " OR ";
      const bool = getBool(query[i].bool);
      const field = getField(query[i].field);
      sql += `${field} ${bool} \"${query[i].value}\"`;
    }
  }

  try {
    const db = await dbPromise;
    const promisePool = db.promise();

    promisePool.query(sql).then(([rows, fields]) => {
      res.json(rows);
    });
  } catch (error) {
    console.error("Error running query:", error);
    res.status(500).send("Internal Server Error");
  }
});

router.get("/query-tool-fields", async (req, res) => {
  const queries = {
    person: "DESCRIBE person",
    document: "DESCRIBE document",
    place: "DESCRIBE place",
    organization: "DESCRIBE organization",
    religion: "DESCRIBE religion",
  };

  try {
    const db = await dbPromise;
    const promisePool = db.promise();

    const results = await Promise.all(
      Object.entries(queries).map(async ([view, query]) => {
        const [rows] = await promisePool.query(query);
        return rows.map((row) => ({ field: row.Field, view }));
      })
    );

    const allFields = results.flat();

    res.json(allFields);
  } catch (error) {
    console.error("Error fetching data:", error);
    res.status(500).send("Internal Server Error");
  }
});

const convertDataToGraph = async (data) => {
  const nodesMap = new Map();
  const edgesMap = new Map();

  const db = await dbPromise;
  const promisePool = db.promise();

  // Collect IDs from data
  const personIDs = new Set();
  const documentIDs = new Set();
  const religionIDs = new Set();
  const organizationIDs = new Set();

  data.forEach((row) => {
    if (row.personID) personIDs.add(row.personID);
    if (row.docID) documentIDs.add(row.docID);
    if (row.religionID) religionIDs.add(row.religionID);
    if (row.organizationID) organizationIDs.add(row.organizationID);
  });

  // Fetch people
  let peopleResults = [];
  if (personIDs.size > 0) {
    const peopleQuery = `
      SELECT * FROM person
      WHERE personID IN (?)
    `;
    [peopleResults] = await promisePool.query(peopleQuery, [Array.from(personIDs)]);
  }

  // Fetch documents
  let documentResults = [];
  if (documentIDs.size > 0) {
    const documentsQuery = `
      SELECT a.*, b.internalPDFname, DATE_FORMAT(a.sortingDate, '%Y-%m-%d') AS date 
      FROM document a
      LEFT JOIN pdf_documents b ON a.documentID = b.documentID
      AND b.fileTypeID = 2
      WHERE a.documentID IN (?)
    `;
    [documentResults] = await promisePool.query(documentsQuery, [Array.from(documentIDs)]);
  }

  // Process people
  peopleResults.forEach((person) => {
    nodesMap.set(`person_${person.personID}`, {
      id: `person_${person.personID}`,
      fullName: `${person.firstName} ${person.lastName}`.replace(
        /\b\w/g,
        (l) => l.toUpperCase()
      ),
      documents: [],
      relations: [],
      mentions: [],
      group: "person",
      nodeType: "person",
      ...person,
    });
  });

  // Process documents
  documentResults.forEach((document) => {
    nodesMap.set(`document_${document.documentID}`, {
      id: `document_${document.documentID}`,
      label: `${document.importID}`,
      group: "document",
      nodeType: "document",
      keywords: [],
      ...document,
    });
  });

  // Fetch person2document connections involving these people or documents
  let person2documentResults = [];
  if (personIDs.size > 0 || documentIDs.size > 0) {
    const personIDsArray = Array.from(personIDs);
    const documentIDsArray = Array.from(documentIDs);
    const whereClauses = [];
    const params = [];

    if (personIDsArray.length > 0) {
      whereClauses.push('personID IN (?)');
      params.push(personIDsArray);
    }
    if (documentIDsArray.length > 0) {
      whereClauses.push('docID IN (?)');
      params.push(documentIDsArray);
    }

    const person2documentQuery = `
      SELECT *
      FROM person2document
      WHERE ${whereClauses.join(' OR ')}
    `;
    [person2documentResults] = await promisePool.query(person2documentQuery, params);
  }

  // Process person2document connections
  person2documentResults.forEach((connection) => {
    const personNode = nodesMap.get(`person_${connection.personID}`);
    const documentNode = nodesMap.get(`document_${connection.docID}`);

    if (personNode && documentNode) {
      personNode.documents.push({ document: documentNode });

      // Add edge
      const key = `person_${connection.personID}-document_${connection.docID}`;
      edgesMap.set(key, {
        from: `person_${connection.personID}`,
        to: `document_${connection.docID}`,
        role: connection.roleID,
        type:
          connection.roleID === 1
            ? "sender"
            : connection.roleID === 2
            ? "receiver"
            : connection.roleID === 3
            ? "mentioned"
            : connection.roleID === 4
            ? "author"
            : connection.roleID === 5
            ? "waypoint"
            : undefined,
        ...connection,
      });
    }
  });

  // Fetch relationships involving these people
  let relationshipsResults = [];
  if (personIDs.size > 0) {
    const relationshipsQuery = `
      SELECT
        r.relationshipID,
        r.person1ID,
        r.person2ID,
        COALESCE(rt1.relationshipDesc, 'Unknown') AS relationship1to2Desc,
        COALESCE(rt2.relationshipDesc, 'Unknown') AS relationship2to1Desc,
        r.dateStart,
        r.dateEnd,
        r.uncertain,
        r.dateEndCause,
        r.relationship1to2ID,
        r.relationship2to1ID
      FROM
        relationship r
      LEFT JOIN
        relationshiptype rt1 ON r.relationship1to2ID = rt1.relationshiptypeID
      LEFT JOIN
        relationshiptype rt2 ON r.relationship2to1ID = rt2.relationshiptypeID
      WHERE
        r.person1ID IN (?) OR r.person2ID IN (?)
      ORDER BY relationshipID;
    `;
    const personIDsArray = Array.from(personIDs);
    [relationshipsResults] = await promisePool.query(relationshipsQuery, [personIDsArray, personIDsArray]);
  }

  // Process relationships
  relationshipsResults.forEach((relationship) => {
    const person1Node = nodesMap.get(`person_${relationship.person1ID}`);
    const person2Node = nodesMap.get(`person_${relationship.person2ID}`);

    if (person1Node && person2Node) {
      person1Node.relations.push({
        relationship: {
          ...relationship,
          person1: person1Node.fullName,
          person2: person2Node.fullName,
        },
      });
      person2Node.relations.push({
        relationship: {
          ...relationship,
          person1: person1Node.fullName,
          person2: person2Node.fullName,
        },
      });

      // Add edge
      const key = `person_${relationship.person1ID}-person_${relationship.person2ID}`;
      edgesMap.set(key, {
        from: `person_${relationship.person1ID}`,
        to: `person_${relationship.person2ID}`,
        type: "relationship",
        relationship1to2Desc: relationship.relationship1to2Desc || "Unknown",
        relationship2to1Desc: relationship.relationship2to1Desc || "Unknown",
        dateStart: relationship.dateStart || "N/A",
        dateEnd: relationship.dateEnd || "N/A",
        ...relationship,
      });

      const reverseKey = `person_${relationship.person2ID}-person_${relationship.person1ID}`;

      if (!edgesMap.has(reverseKey)) {
        edgesMap.set(reverseKey, {
          from: `person_${relationship.person2ID}`,
          to: `person_${relationship.person1ID}`,
          type: "relationship",
          relationship1to2Desc:
            relationship.relationship2to1Desc || "Unknown",
          relationship2to1Desc:
            relationship.relationship1to2Desc || "Unknown",
          dateStart: relationship.dateStart || "N/A",
          dateEnd: relationship.dateEnd || "N/A",
          ...relationship,
        });
      }
    }
  });

  // Fetch and process religions
  let religionResults = [];
  if (religionIDs.size > 0) {
    const religionsQuery = `
      SELECT *
      FROM religion
      WHERE religionID IN (?)
    `;
    [religionResults] = await promisePool.query(religionsQuery, [Array.from(religionIDs)]);

    religionResults.forEach((religion) => {
      nodesMap.set(`religion_${religion.religionID}`, {
        id: `religion_${religion.religionID}`,
        label: religion.religionDesc,
        group: "religion",
        nodeType: "religion",
        ...religion,
      });
    });

    // Fetch person2religion connections
    let person2religionResults = [];
    const personIDsArray = Array.from(personIDs);
    const religionIDsArray = Array.from(religionIDs);
    if (personIDsArray.length > 0 || religionIDsArray.length > 0) {
      const whereClauses = [];
      const params = [];
      if (personIDsArray.length > 0) {
        whereClauses.push('personID IN (?)');
        params.push(personIDsArray);
      }
      if (religionIDsArray.length > 0) {
        whereClauses.push('religionID IN (?)');
        params.push(religionIDsArray);
      }
      const person2religionQuery = `
        SELECT *
        FROM person2religion
        WHERE ${whereClauses.join(' OR ')}
      `;
      [person2religionResults] = await promisePool.query(person2religionQuery, params);

      person2religionResults.forEach((connection) => {
        const personNode = nodesMap.get(`person_${connection.personID}`);
        const religionNode = nodesMap.get(
          `religion_${connection.religionID}`
        );

        if (personNode && religionNode) {
          // Add edge
          const key = `person_${connection.personID}-religion_${connection.religionID}`;
          edgesMap.set(key, {
            from: `person_${connection.personID}`,
            to: `religion_${connection.religionID}`,
            role: "religion",
            type: "religion",
            ...connection,
          });
        }
      });
    }
  }

  // Fetch and process organizations
  let organizationResults = [];
  if (organizationIDs.size > 0) {
    const organizationsQuery = `
      SELECT *
      FROM organization
      WHERE organizationID IN (?)
    `;
    [organizationResults] = await promisePool.query(organizationsQuery, [Array.from(organizationIDs)]);

    organizationResults.forEach((organization) => {
      nodesMap.set(`organization_${organization.organizationID}`, {
        id: `organization_${organization.organizationID}`,
        label: organization.organizationDesc,
        group: "organization",
        nodeType: "organization",
        ...organization,
      });
    });

    // Fetch person2organization connections
    let person2organizationResults = [];
    const personIDsArray = Array.from(personIDs);
    const organizationIDsArray = Array.from(organizationIDs);
    if (personIDsArray.length > 0 || organizationIDsArray.length > 0) {
      const whereClauses = [];
      const params = [];
      if (personIDsArray.length > 0) {
        whereClauses.push('personID IN (?)');
        params.push(personIDsArray);
      }
      if (organizationIDsArray.length > 0) {
        whereClauses.push('organizationID IN (?)');
        params.push(organizationIDsArray);
      }
      const person2organizationQuery = `
        SELECT *
        FROM person2organization
        WHERE ${whereClauses.join(' OR ')}
      `;
      [person2organizationResults] = await promisePool.query(person2organizationQuery, params);

      person2organizationResults.forEach((connection) => {
        const personNode = nodesMap.get(`person_${connection.personID}`);
        const organizationNode = nodesMap.get(
          `organization_${connection.organizationID}`
        );

        if (personNode && organizationNode) {
          // Add edge
          const key = `person_${connection.personID}-organization_${connection.organizationID}`;
          edgesMap.set(key, {
            from: `person_${connection.personID}`,
            to: `organization_${connection.organizationID}`,
            role: "organization",
            type: "organization",
            ...connection,
          });
        }
      });
    }
  }

  // Convert nodesMap and edgesMap to arrays
  const nodes = Array.from(nodesMap.values());
  const edges = Array.from(edgesMap.values());

  return { nodes, edges };
};






router.post("/knex-query", async (req, res) => {
  const { tables, fields, operators, values, dependentFields } = req.body;

  try {
    const db = await dbPromise;
    const promisePool = db.promise();
    const results = [];

    let knexQuery;

    if (tables && tables.length > 1) {
      // Define the first CTE for `secondary_ids`
      const secondaryIdsQuery = knex(tables[0])
        .select(fields[0]) // "docID" in person2document
        .where(fields[1], operators[0], values[0]); // e.g., personID = 446

      // Use `.with()` to create the CTE
      knexQuery = knex
        .with("secondary_ids", secondaryIdsQuery)
        .select("*")
        .from(tables[1]) // `document` table
        .whereIn(
          dependentFields[0],
          knex.select(fields[0]).from("secondary_ids")
        );
    } else if (tables && tables.length === 1) {
      // Single table scenario without CTEs
      knexQuery = knex(tables[0]).select("*");

      knexQuery = knexQuery.where(fields[0], operators[0], values[0]);

      // Apply filters for single table scenario
      for (let i = 1; i < fields.length; i++) {
        if (dependentFields[i - 1] === "AND") {
          knexQuery = knexQuery.andWhere(fields[i], operators[i], values[i]);
        } else {
          knexQuery = knexQuery.orWhere(fields[i], operators[i], values[i]);
        }
      }
    } else {
      console.log("Tables are not defined or empty");
    }

    // Execute the query
    const [rows] = await promisePool.query(knexQuery.toString());

    // Convert the data to a graph
    const { nodes, edges } = await convertDataToGraph(rows);
    results.push({ rows, edges, nodes });

    res.json({ rows, edges, nodes });
  } catch (error) {
    console.error("Error running query:", error);
    res.status(500).send("Internal Server Error");
  }
});

router.post("/nodes", async (req, res) => {
  const peopleQuery = `
    SELECT 
      *
    FROM
      person;
  `;

  const documentsQuery = `
    SELECT a.*, b.internalPDFname, DATE_FORMAT(a.sortingDate, '%Y-%m-%d') AS date 
    FROM document a
    JOIN pdf_documents b ON a.documentID = b.documentID
    and b.fileTypeID = 2
    ;
  `;

  const keywordsQuery = `
    SELECT
      a.keywordID, a.keyword, a.keywordLOD, a.parentID, a.parcel, a.keywordDef,
      b.keyword2DocID, b.keywordID, b.docID, b.uncertain
    FROM
      keyword a
    LEFT JOIN
      keyword2document b ON a.keywordID = b.keywordID;
  `;

  const religionsQuery = `
    SELECT *
    FROM religion;
  `;

  const organizationsQuery = `
    SELECT *
    FROM organization;
  `;

  const people2documentQuery = `
    SELECT *
    FROM person2document;
  `;

  const relationshipsQuery = `
    SELECT
      r.relationshipID,
      r.person1ID,
      r.person2ID,
      COALESCE(rt1.relationshipDesc, 'Unknown') AS relationship1to2Desc,
      COALESCE(rt2.relationshipDesc, 'Unknown') AS relationship2to1Desc,
      r.dateStart,
      r.dateEnd,
      r.uncertain,
      r.dateEndCause,
      r.relationship1to2ID,
      r.relationship2to1ID
    FROM
      relationship r
    LEFT JOIN
      relationshiptype rt1 ON r.relationship1to2ID = rt1.relationshiptypeID
    LEFT JOIN
      relationshiptype rt2 ON r.relationship2to1ID = rt2.relationshiptypeID
    WHERE person1ID != person2ID
    ORDER BY relationshipID;
  `;

  try {
    const db = await dbPromise;
    const promisePool = db.promise();

    // Execute all queries in parallel
    const [
      [peopleResults],
      [documentResults],
      [religionResults],
      [organizationResults],
      [people2documentResults],
      [relationshipsResults],
      [keywordsResults],
    ] = await Promise.all([
      promisePool.query(peopleQuery),
      promisePool.query(documentsQuery),
      promisePool.query(religionsQuery),
      promisePool.query(organizationsQuery),
      promisePool.query(people2documentQuery),
      promisePool.query(relationshipsQuery),
      promisePool.query(keywordsQuery),
    ]);

    const nodesMap = new Map();

    // Process People
    peopleResults.forEach((person) => {
      nodesMap.set(`person_${person.personID}`, {
        id: `person_${person.personID}`,
        fullName: `${person.firstName} ${person.lastName}`.replace(
          /\b\w/g,
          (l) => l.toUpperCase()
        ),
        documents: [],
        relations: [],
        mentions: [],
        group: "person",
        nodeType: "person",
        ...person,
      });
    });

    // Process Documents
    documentResults.forEach((document) => {
      nodesMap.set(`document_${document.documentID}`, {
        id: `document_${document.documentID}`,
        label: `${document.importID}`,
        group: "document",
        nodeType: "document",
        keywords: [],
        ...document,
      });
    });

    // Process Keywords
    keywordsResults.forEach((keyword) => {
      const document = nodesMap.get(`document_${keyword.docID}`);
      if (document) {
        document.keywords.push(keyword.keyword);
        // console.log(keyword);
      }
    });

    // Process Religions
    religionResults.forEach((religion) => {
      nodesMap.set(`religion_${religion.religionID}`, {
        id: `religion_${religion.religionID}`,
        label: religion.religionDesc,
        group: "religion",
        nodeType: "religion",
        ...religion,
      });
    });

    // Process Organizations
    organizationResults.forEach((organization) => {
      nodesMap.set(`organization_${organization.organizationID}`, {
        id: `organization_${organization.organizationID}`,
        label: organization.organizationDesc,
        group: "organization",
        nodeType: "organization",
        ...organization,
      });
    });

    // Process Person to Document Relationships
    people2documentResults.forEach((connection) => {
      const personNode = nodesMap.get(`person_${connection.personID}`);
      const documentNode = nodesMap.get(`document_${connection.docID}`);

      //add sender and receiver to document
      const senderID = people2documentResults.find(
        (connection) =>
          connection.docID === documentNode.documentID &&
          connection.roleID === 1
      );

      const sender = peopleResults.find(
        (person) => person.personID === senderID?.personID
      );

      const senderFullNamelower = `${sender?.firstName} ${sender?.lastName}`;

      const receiverID = people2documentResults.find(
        (connection) =>
          connection.docID === documentNode.documentID &&
          connection.roleID === 2
      );

      const receiver = peopleResults.find(
        (person) => person.personID === receiverID?.personID
      );

      const receiverFullNamelower = `${receiver?.firstName} ${receiver?.lastName}`;

      const senderFullName = senderFullNamelower.replace(/\b\w/g, (l) =>
        l.toUpperCase()
      );
      const receiverFullName = receiverFullNamelower.replace(/\b\w/g, (l) =>
        l.toUpperCase()
      );

      documentNode.sender = senderFullName;
      documentNode.receiver = receiverFullName;

      if (personNode && documentNode) {
        personNode.documents.push({ document: documentNode });
      }
    });

    // Process Relationships
    relationshipsResults.forEach((relationship) => {
      const person1Node = nodesMap.get(`person_${relationship.person1ID}`);
      const person2Node = nodesMap.get(`person_${relationship.person2ID}`);

      if (person1Node && person2Node) {
        person1Node.relations.push({
          relationship: {
            ...relationship,
            person1: person1Node.fullName,
            person2: person2Node.fullName,
          },
        });
        person2Node.relations.push({
          relationship: {
            ...relationship,
            person1: person1Node.fullName,
            person2: person2Node.fullName,
          },
        });
      }
    });

    // Construct the nodes array after all processing is done
    const nodes = Array.from(nodesMap.values());

    res.json(nodes);
  } catch (error) {
    console.error("Error fetching data:", error);
    res.status(500).send("Internal Server Error");
  }
});

router.post("/edges", async (req, res) => {
  const person2documentQuery = `
    SELECT *
    FROM person2document;
  `;

  const person2religionQuery = `
    SELECT *
    FROM person2religion;
  `;

  const person2organizationQuery = `
    SELECT *
    FROM person2organization;
  `;

  const relationshipQuery = `
    SELECT
      r.relationshipID,
      r.person1ID,
      r.person2ID,
      COALESCE(rt1.relationshipDesc, 'Unknown') AS relationship1to2Desc,
      COALESCE(rt2.relationshipDesc, 'Unknown') AS relationship2to1Desc,
      r.dateStart,
      r.dateEnd,
      r.uncertain,
      r.dateEndCause,
      r.relationship1to2ID,
      r.relationship2to1ID
    FROM
      relationship r
    LEFT JOIN
      relationshiptype rt1 ON r.relationship1to2ID = rt1.relationshiptypeID
    LEFT JOIN
      relationshiptype rt2 ON r.relationship2to1ID = rt2.relationshiptypeID
    WHERE person1ID != person2ID
    ORDER BY relationshipID;
  `;

  try {
    const db = await dbPromise;
    const promisePool = db.promise();
    const [person2documentResults] = await promisePool.query(
      person2documentQuery
    );
    const [person2religionResults] = await promisePool.query(
      person2religionQuery
    );
    const [person2organizationResults] = await promisePool.query(
      person2organizationQuery
    );
    const [relationshipResults] = await promisePool.query(relationshipQuery);

    const edgesMap = new Map();

    person2documentResults.forEach((connection) => {
      const key = `person_${connection.personID}-document_${connection.docID}`;
      edgesMap.set(key, {
        from: `person_${connection.personID}`,
        to: `document_${connection.docID}`,
        role: connection.roleID,
        type: connection.roleID === 1 ? "sender" :
        connection.roleID === 2 ? "receiver" :
        connection.roleID === 3 ? "mentioned" :
        connection.roleID === 4 ? "author" :
        connection.roleID === 5 ? "waypoint" : undefined,

        ...connection,
      });
    });

    person2religionResults.forEach((connection) => {
      const key = `person_${connection.personID}-religion_${connection.religionID}`;
      edgesMap.set(key, {
        from: `person_${connection.personID}`,
        to: `religion_${connection.religionID}`,
        role: "religion",
        type: "religion",
        ...connection,
      });
    });

    person2organizationResults.forEach((connection) => {
      const key = `person_${connection.personID}-organization_${connection.organizationID}`;
      edgesMap.set(key, {
        from: `person_${connection.personID}`,
        to: `organization_${connection.organizationID}`,
        role: "organization",
        type: "organization",
        ...connection,
      });
    });

    relationshipResults.forEach((relationship) => {
      const key = `person_${relationship.person1ID}-person_${relationship.person2ID}`;
      edgesMap.set(key, {
        from: `person_${relationship.person1ID}`,
        to: `person_${relationship.person2ID}`,
        type: "relationship",
        relationship1to2Desc: relationship.relationship1to2Desc || "Unknown",
        relationship2to1Desc: relationship.relationship2to1Desc || "Unknown",
        dateStart: relationship.dateStart || "N/A",
        dateEnd: relationship.dateEnd || "N/A",
        ...relationship,
      });

      const reverseKey = `person_${relationship.person2ID}-person_${relationship.person1ID}`;

      if (!edgesMap.has(reverseKey)) {
        edgesMap.set(reverseKey, {
          from: `person_${relationship.person2ID}`,
          to: `person_${relationship.person1ID}`,
          type: "relationship",
          relationship1to2Desc: relationship.relationship2to1Desc || "Unknown",
          relationship2to1Desc: relationship.relationship1to2Desc || "Unknown",
          dateStart: relationship.dateStart || "N/A",
          dateEnd: relationship.dateEnd || "N/A",
          ...relationship,
        });
      }
    });

    const edges = Array.from(edgesMap.values());

    res.json(edges);
  } catch (error) {
    console.error("Error fetching data:", error);
    res.status(500).send("Internal Server Error");
  }
});



router.post('/nodes-query', async (req, res) => {
  const { tables, fields, operators, values, dependentFields } = req.body;

  try {
    const db = await dbPromise;
    const promisePool = db.promise();

    let query = knex(tables[0]).select('*');

    // Build the WHERE clause based on the input parameters
    for (let i = 0; i < fields.length; i++) {
      const field = fields[i];
      const operator = operators[i];
      const value = values[i];

      if (i === 0) {
        query = query.where(field, operator, value);
      } else {
        const dependentField = dependentFields[i - 1];
        if (dependentField === 'AND') {
          query = query.andWhere(field, operator, value);
        } else {
          query = query.orWhere(field, operator, value);
        }
      }
    }

    // Execute the query
    const [rows] = await promisePool.query(query.toString());

    // Process the nodes similar to the /nodes route
    const nodesMap = new Map();
    const personIDs = new Set();
    const documentIDs = new Set();
    const organizationIDs = new Set();
    const religionIDs = new Set();

    // Process initial nodes and collect IDs
    for (const row of rows) {
      if (tables[0] === 'person') {
        const nodeId = `person_${row.personID}`;
        nodesMap.set(nodeId, {
          id: nodeId,
          fullName: `${row.firstName} ${row.lastName}`.replace(/\b\w/g, (l) =>
            l.toUpperCase()
          ),
          documents: [],
          relations: [],
          mentions: [],
          group: 'person',
          nodeType: 'person',
          ...row,
        });
        personIDs.add(row.personID);
      } else if (tables[0] === 'document') {
        const nodeId = `document_${row.documentID}`;
        nodesMap.set(nodeId, {
          id: nodeId,
          label: `${row.importID}`,
          group: 'document',
          nodeType: 'document',
          keywords: [],
          ...row,
        });
        documentIDs.add(row.documentID);
      } else if (tables[0] === 'organization') {
        const nodeId = `organization_${row.organizationID}`;
        nodesMap.set(nodeId, {
          id: nodeId,
          label: row.organizationDesc,
          group: 'organization',
          nodeType: 'organization',
          ...row,
        });
        organizationIDs.add(row.organizationID);
      } else if (tables[0] === 'religion') {
        const nodeId = `religion_${row.religionID}`;
        nodesMap.set(nodeId, {
          id: nodeId,
          label: row.religionDesc,
          group: 'religion',
          nodeType: 'religion',
          ...row,
        });
        religionIDs.add(row.religionID);
      }
      // Add more cases for other tables if needed
    }

    // **Fetch associated documents for each person**
    if (personIDs.size > 0) {
      const personIDsArray = Array.from(personIDs);

      // Fetch person2document entries for these persons
      const person2documentQuery = `
        SELECT *
        FROM person2document
        WHERE personID IN (?)
      `;
      const [person2documentResults] = await promisePool.query(
        person2documentQuery,
        [personIDsArray]
      );

      // Collect document IDs
      person2documentResults.forEach((p2d) => {
        documentIDs.add(p2d.docID);
      });

      // Fetch documents
      if (documentIDs.size > 0) {
        const documentIDsArray = Array.from(documentIDs);

        const documentsQuery = `
          SELECT a.*, b.internalPDFname, DATE_FORMAT(a.sortingDate, '%Y-%m-%d') AS date 
          FROM document a
          LEFT JOIN pdf_documents b ON a.documentID = b.documentID
          AND b.fileTypeID = 2
          WHERE a.documentID IN (?)
        `;
        const [documentResults] = await promisePool.query(documentsQuery, [documentIDsArray]);

        documentResults.forEach((document) => {
          const nodeId = `document_${document.documentID}`;
          if (!nodesMap.has(nodeId)) {
            nodesMap.set(nodeId, {
              id: nodeId,
              label: `${document.importID}`,
              group: 'document',
              nodeType: 'document',
              keywords: [],
              ...document,
            });
          }
        });
      }

      // Process Person to Document Relationships
      person2documentResults.forEach((connection) => {
        const personNode = nodesMap.get(`person_${connection.personID}`);
        const documentNode = nodesMap.get(`document_${connection.docID}`);

        if (personNode && documentNode) {
          personNode.documents.push({ document: documentNode });
        }
      });

      // **Add sender and receiver information to documents**
      if (documentIDs.size > 0) {
        const people2documentResults = person2documentResults;

        for (const documentData of nodesMap.values()) {
          if (documentData.nodeType === 'document') {
            const documentNode = documentData;

            // Add sender and receiver information
            const senderConnection = people2documentResults.find(
              (connection) =>
                connection.docID === documentData.documentID &&
                connection.roleID === 1
            );
            const receiverConnection = people2documentResults.find(
              (connection) =>
                connection.docID === documentData.documentID &&
                connection.roleID === 2
            );

            const senderNode = nodesMap.get(`person_${senderConnection?.personID}`);
            const receiverNode = nodesMap.get(`person_${receiverConnection?.personID}`);

            const senderFullName = senderNode?.fullName || 'Unknown';
            const receiverFullName = receiverNode?.fullName || 'Unknown';

            documentNode.sender = senderFullName;
            documentNode.receiver = receiverFullName;
          }
        }
      }
    }

    // **Fetch and process relationships**
    if (personIDs.size > 0) {
      const personIDsArray = Array.from(personIDs);

      const relationshipsQuery = `
        SELECT
          r.relationshipID,
          r.person1ID,
          r.person2ID,
          COALESCE(rt1.relationshipDesc, 'Unknown') AS relationship1to2Desc,
          COALESCE(rt2.relationshipDesc, 'Unknown') AS relationship2to1Desc,
          r.dateStart,
          r.dateEnd,
          r.uncertain,
          r.dateEndCause,
          r.relationship1to2ID,
          r.relationship2to1ID
        FROM
          relationship r
        LEFT JOIN
          relationshiptype rt1 ON r.relationship1to2ID = rt1.relationshiptypeID
        LEFT JOIN
          relationshiptype rt2 ON r.relationship2to1ID = rt2.relationshiptypeID
        WHERE
          r.person1ID IN (?) OR r.person2ID IN (?)
        ORDER BY relationshipID;
      `;
      const [relationshipsResults] = await promisePool.query(
        relationshipsQuery,
        [personIDsArray, personIDsArray]
      );

      for (const relationship of relationshipsResults) {
        // **Add the other person as a node if not already added**
        const relatedPersonIDs = [relationship.person1ID, relationship.person2ID];
        for (const personID of relatedPersonIDs) {
          const nodeId = `person_${personID}`;
          if (!nodesMap.has(nodeId)) {
            const personQuery = `
              SELECT *
              FROM person
              WHERE personID = ?
            `;
            const [personRows] = await promisePool.query(personQuery, [personID]);
            const personData = personRows[0];
            if (personData) {
              nodesMap.set(nodeId, {
                id: nodeId,
                fullName: `${personData.firstName} ${personData.lastName}`.replace(/\b\w/g, (l) =>
                  l.toUpperCase()
                ),
                documents: [],
                relations: [],
                mentions: [],
                group: 'person',
                nodeType: 'person',
                ...personData,
              });
              personIDs.add(personID);
            }
          }
        }

        // Update person nodes
        const updatedPerson1Node = nodesMap.get(`person_${relationship.person1ID}`);
        const updatedPerson2Node = nodesMap.get(`person_${relationship.person2ID}`);

        if (updatedPerson1Node && updatedPerson2Node) {
          updatedPerson1Node.relations.push({
            relationship: {
              ...relationship,
              person1: updatedPerson1Node.fullName,
              person2: updatedPerson2Node.fullName,
            },
          });
          updatedPerson2Node.relations.push({
            relationship: {
              ...relationship,
              person1: updatedPerson1Node.fullName,
              person2: updatedPerson2Node.fullName,
            },
          });
        }
      }
    }

    // **Fetch keywords and add them to documents**
    if (documentIDs.size > 0) {
      const documentIDsArray = Array.from(documentIDs);

      const keywordsQuery = `
        SELECT
          a.keywordID, a.keyword, a.keywordLOD, a.parentID, a.parcel, a.keywordDef,
          b.keyword2DocID, b.keywordID, b.docID, b.uncertain
        FROM
          keyword a
        LEFT JOIN
          keyword2document b ON a.keywordID = b.keywordID
        WHERE
          b.docID IN (?)
      `;
      const [keywordsResults] = await promisePool.query(keywordsQuery, [documentIDsArray]);

      keywordsResults.forEach((keyword) => {
        const documentNode = nodesMap.get(`document_${keyword.docID}`);
        if (documentNode) {
          documentNode.keywords.push(keyword.keyword);
        }
      });
    }

    // **Process person2organization**
    if (organizationIDs.size > 0 || personIDs.size > 0) {
      const organizationIDsArray = Array.from(organizationIDs);
      const personIDsArray = Array.from(personIDs);

      const whereClauses = [];
      const params = [];

      if (organizationIDsArray.length > 0) {
        whereClauses.push('organizationID IN (?)');
        params.push(organizationIDsArray);
      }

      if (personIDsArray.length > 0) {
        whereClauses.push('personID IN (?)');
        params.push(personIDsArray);
      }

      if (whereClauses.length > 0) {
        const person2organizationQuery = `
          SELECT *
          FROM person2organization
          WHERE ${whereClauses.join(' OR ')}
        `;
        const [person2organizationResults] = await promisePool.query(
          person2organizationQuery,
          params
        );

        for (const p2o of person2organizationResults) {
          // Add person node if not already added
          const personNodeId = `person_${p2o.personID}`;
          if (!nodesMap.has(personNodeId)) {
            const personQuery = `
              SELECT *
              FROM person
              WHERE personID = ?
            `;
            const [personRows] = await promisePool.query(personQuery, [p2o.personID]);
            const personData = personRows[0];
            if (personData) {
              nodesMap.set(personNodeId, {
                id: personNodeId,
                fullName: `${personData.firstName} ${personData.lastName}`.replace(/\b\w/g, (l) =>
                  l.toUpperCase()
                ),
                documents: [],
                relations: [],
                mentions: [],
                group: 'person',
                nodeType: 'person',
                ...personData,
              });
              personIDs.add(p2o.personID);
            }
          }

          // Add organization node if not already added
          const organizationNodeId = `organization_${p2o.organizationID}`;
          if (!nodesMap.has(organizationNodeId)) {
            const organizationQuery = `
              SELECT *
              FROM organization
              WHERE organizationID = ?
            `;
            const [organizationRows] = await promisePool.query(organizationQuery, [p2o.organizationID]);
            const organizationData = organizationRows[0];
            if (organizationData) {
              nodesMap.set(organizationNodeId, {
                id: organizationNodeId,
                label: organizationData.organizationDesc,
                group: 'organization',
                nodeType: 'organization',
                ...organizationData,
              });
              organizationIDs.add(p2o.organizationID);
            }
          }
        }
      }
    }

    // **Process person2religion**
    if (religionIDs.size > 0 || personIDs.size > 0) {
      const religionIDsArray = Array.from(religionIDs);
      const personIDsArray = Array.from(personIDs);

      const whereClauses = [];
      const params = [];

      if (religionIDsArray.length > 0) {
        whereClauses.push('religionID IN (?)');
        params.push(religionIDsArray);
      }

      if (personIDsArray.length > 0) {
        whereClauses.push('personID IN (?)');
        params.push(personIDsArray);
      }

      if (whereClauses.length > 0) {
        const person2religionQuery = `
          SELECT *
          FROM person2religion
          WHERE ${whereClauses.join(' OR ')}
        `;
        const [person2religionResults] = await promisePool.query(
          person2religionQuery,
          params
        );

        for (const p2r of person2religionResults) {
          // Add person node if not already added
          const personNodeId = `person_${p2r.personID}`;
          if (!nodesMap.has(personNodeId)) {
            const personQuery = `
              SELECT *
              FROM person
              WHERE personID = ?
            `;
            const [personRows] = await promisePool.query(personQuery, [p2r.personID]);
            const personData = personRows[0];
            if (personData) {
              nodesMap.set(personNodeId, {
                id: personNodeId,
                fullName: `${personData.firstName} ${personData.lastName}`.replace(/\b\w/g, (l) =>
                  l.toUpperCase()
                ),
                documents: [],
                relations: [],
                mentions: [],
                group: 'person',
                nodeType: 'person',
                ...personData,
              });
              personIDs.add(p2r.personID);
            }
          }

          // Add religion node if not already added
          const religionNodeId = `religion_${p2r.religionID}`;
          if (!nodesMap.has(religionNodeId)) {
            const religionQuery = `
              SELECT *
              FROM religion
              WHERE religionID = ?
            `;
            const [religionRows] = await promisePool.query(religionQuery, [p2r.religionID]);
            const religionData = religionRows[0];
            if (religionData) {
              nodesMap.set(religionNodeId, {
                id: religionNodeId,
                label: religionData.religionDesc,
                group: 'religion',
                nodeType: 'religion',
                ...religionData,
              });
              religionIDs.add(p2r.religionID);
            }
          }
        }
      }
    }

    // **Fetch associated documents for newly added persons**
    // (You may need to re-fetch documents if new persons were added)

    // **Finalize nodes array**
    const nodes = Array.from(nodesMap.values());

    res.json(nodes);
  } catch (error) {
    console.error('Error running nodes-query:', error);
    res.status(500).send('Internal Server Error');
  }
});





router.post('/edges-query', async (req, res) => {
  const { tables, fields, operators, values, dependentFields } = req.body;

  try {
    const db = await dbPromise;
    const promisePool = db.promise();

    // **Step 1: Generate Nodes (similar to /nodes-query)**
    let query = knex(tables[0]).select('*');

    // Build the WHERE clause based on the input parameters
    for (let i = 0; i < fields.length; i++) {
      const field = fields[i];
      const operator = operators[i];
      const value = values[i];

      if (i === 0) {
        query = query.where(field, operator, value);
      } else {
        const dependentField = dependentFields[i - 1];
        if (dependentField === 'AND') {
          query = query.andWhere(field, operator, value);
        } else {
          query = query.orWhere(field, operator, value);
        }
      }
    }

    // Execute the query to get nodes
    const [rows] = await promisePool.query(query.toString());

    // **Step 2: Process Nodes and Extract IDs**
    const nodesMap = new Map();
    const personIDs = new Set();
    const documentIDs = new Set();
    const organizationIDs = new Set();
    const religionIDs = new Set();

    // Process initial nodes and collect IDs
    for (const row of rows) {
      if (tables[0] === 'person') {
        const nodeId = `person_${row.personID}`;
        nodesMap.set(nodeId, {
          id: nodeId,
          fullName: `${row.firstName} ${row.lastName}`.replace(/\b\w/g, (l) =>
            l.toUpperCase()
          ),
          group: 'person',
          nodeType: 'person',
          ...row,
        });
        personIDs.add(row.personID);
      } else if (tables[0] === 'document') {
        const nodeId = `document_${row.documentID}`;
        nodesMap.set(nodeId, {
          id: nodeId,
          label: `${row.importID}`,
          group: 'document',
          nodeType: 'document',
          ...row,
        });
        documentIDs.add(row.documentID);
      } else if (tables[0] === 'organization') {
        const nodeId = `organization_${row.organizationID}`;
        nodesMap.set(nodeId, {
          id: nodeId,
          label: row.organizationDesc,
          group: 'organization',
          nodeType: 'organization',
          ...row,
        });
        organizationIDs.add(row.organizationID);
      } else if (tables[0] === 'religion') {
        const nodeId = `religion_${row.religionID}`;
        nodesMap.set(nodeId, {
          id: nodeId,
          label: row.religionDesc,
          group: 'religion',
          nodeType: 'religion',
          ...row,
        });
        religionIDs.add(row.religionID);
      }
      // Add more cases for other tables if needed
    }

    // **Fetch associated documents for each person**
    if (personIDs.size > 0) {
      const personIDsArray = Array.from(personIDs);

      // Fetch person2document entries for these persons
      const person2documentQuery = `
        SELECT *
        FROM person2document
        WHERE personID IN (?)
      `;
      const [person2documentResults] = await promisePool.query(
        person2documentQuery,
        [personIDsArray]
      );

      // Collect document IDs
      person2documentResults.forEach((p2d) => {
        documentIDs.add(p2d.docID);
      });

      // Fetch documents
      if (documentIDs.size > 0) {
        const documentIDsArray = Array.from(documentIDs);

        const documentsQuery = `
          SELECT a.*, b.internalPDFname, DATE_FORMAT(a.sortingDate, '%Y-%m-%d') AS date 
          FROM document a
          LEFT JOIN pdf_documents b ON a.documentID = b.documentID
          AND b.fileTypeID = 2
          WHERE a.documentID IN (?)
        `;
        const [documentResults] = await promisePool.query(documentsQuery, [documentIDsArray]);

        documentResults.forEach((document) => {
          const nodeId = `document_${document.documentID}`;
          if (!nodesMap.has(nodeId)) {
            nodesMap.set(nodeId, {
              id: nodeId,
              label: `${document.importID}`,
              group: 'document',
              nodeType: 'document',
              ...document,
            });
          }
        });
      }
    }

    // **Fetch person2organization associations**
    if (personIDs.size > 0 || organizationIDs.size > 0) {
      const personIDsArray = Array.from(personIDs);
      const organizationIDsArray = Array.from(organizationIDs);

      const whereClauses = [];
      const params = [];

      if (personIDsArray.length > 0) {
        whereClauses.push('personID IN (?)');
        params.push(personIDsArray);
      }

      if (organizationIDsArray.length > 0) {
        whereClauses.push('organizationID IN (?)');
        params.push(organizationIDsArray);
      }

      if (whereClauses.length > 0) {
        const person2organizationQuery = `
          SELECT *
          FROM person2organization
          WHERE ${whereClauses.join(' OR ')}
        `;
        const [person2organizationResults] = await promisePool.query(
          person2organizationQuery,
          params
        );

        person2organizationResults.forEach((p2o) => {
          // Collect IDs
          personIDs.add(p2o.personID);
          organizationIDs.add(p2o.organizationID);
        });
      }
    }

    // **Fetch person2religion associations**
    if (personIDs.size > 0 || religionIDs.size > 0) {
      const personIDsArray = Array.from(personIDs);
      const religionIDsArray = Array.from(religionIDs);

      const whereClauses = [];
      const params = [];

      if (personIDsArray.length > 0) {
        whereClauses.push('personID IN (?)');
        params.push(personIDsArray);
      }

      if (religionIDsArray.length > 0) {
        whereClauses.push('religionID IN (?)');
        params.push(religionIDsArray);
      }

      if (whereClauses.length > 0) {
        const person2religionQuery = `
          SELECT *
          FROM person2religion
          WHERE ${whereClauses.join(' OR ')}
        `;
        const [person2religionResults] = await promisePool.query(
          person2religionQuery,
          params
        );

        person2religionResults.forEach((p2r) => {
          // Collect IDs
          personIDs.add(p2r.personID);
          religionIDs.add(p2r.religionID);
        });
      }
    }

    // **Fetch relationships involving persons**
    if (personIDs.size > 0) {
      const personIDsArray = Array.from(personIDs);

      const relationshipsQuery = `
        SELECT
          r.relationshipID,
          r.person1ID,
          r.person2ID,
          COALESCE(rt1.relationshipDesc, 'Unknown') AS relationship1to2Desc,
          COALESCE(rt2.relationshipDesc, 'Unknown') AS relationship2to1Desc,
          r.dateStart,
          r.dateEnd,
          r.uncertain,
          r.dateEndCause,
          r.relationship1to2ID,
          r.relationship2to1ID
        FROM
          relationship r
        LEFT JOIN
          relationshiptype rt1 ON r.relationship1to2ID = rt1.relationshiptypeID
        LEFT JOIN
          relationshiptype rt2 ON r.relationship2to1ID = rt2.relationshiptypeID
        WHERE
          r.person1ID IN (?) OR r.person2ID IN (?)
        ORDER BY relationshipID;
      `;
      const [relationshipsResults] = await promisePool.query(
        relationshipsQuery,
        [personIDsArray, personIDsArray]
      );

      relationshipsResults.forEach((relationship) => {
        personIDs.add(relationship.person1ID);
        personIDs.add(relationship.person2ID);
      });
    }

    // **Update nodesMap with any new persons, organizations, religions**
    // Fetch any new persons not already in nodesMap
    const allPersonIDs = Array.from(personIDs).filter(
      (id) => !nodesMap.has(`person_${id}`)
    );
    if (allPersonIDs.length > 0) {
      const personQuery = `
        SELECT *
        FROM person
        WHERE personID IN (?)
      `;
      const [personRows] = await promisePool.query(personQuery, [allPersonIDs]);
      personRows.forEach((personData) => {
        const nodeId = `person_${personData.personID}`;
        nodesMap.set(nodeId, {
          id: nodeId,
          fullName: `${personData.firstName} ${personData.lastName}`.replace(
            /\b\w/g,
            (l) => l.toUpperCase()
          ),
          group: 'person',
          nodeType: 'person',
          ...personData,
        });
      });
    }

    // Fetch any new organizations not already in nodesMap
    const allOrganizationIDs = Array.from(organizationIDs).filter(
      (id) => !nodesMap.has(`organization_${id}`)
    );
    if (allOrganizationIDs.length > 0) {
      const organizationQuery = `
        SELECT *
        FROM organization
        WHERE organizationID IN (?)
      `;
      const [organizationRows] = await promisePool.query(organizationQuery, [allOrganizationIDs]);
      organizationRows.forEach((organizationData) => {
        const nodeId = `organization_${organizationData.organizationID}`;
        nodesMap.set(nodeId, {
          id: nodeId,
          label: organizationData.organizationDesc,
          group: 'organization',
          nodeType: 'organization',
          ...organizationData,
        });
      });
    }

    // Fetch any new religions not already in nodesMap
    const allReligionIDs = Array.from(religionIDs).filter(
      (id) => !nodesMap.has(`religion_${id}`)
    );
    if (allReligionIDs.length > 0) {
      const religionQuery = `
        SELECT *
        FROM religion
        WHERE religionID IN (?)
      `;
      const [religionRows] = await promisePool.query(religionQuery, [allReligionIDs]);
      religionRows.forEach((religionData) => {
        const nodeId = `religion_${religionData.religionID}`;
        nodesMap.set(nodeId, {
          id: nodeId,
          label: religionData.religionDesc,
          group: 'religion',
          nodeType: 'religion',
          ...religionData,
        });
      });
    }

    // **Step 3: Query Junction Tables to Find Edges**
    const edgesMap = new Map();

    // Fetch person-to-document edges
    if (personIDs.size > 0 && documentIDs.size > 0) {
      const personIDsArray = Array.from(personIDs);
      const documentIDsArray = Array.from(documentIDs);

      const person2documentQuery = `
        SELECT *
        FROM person2document
        WHERE personID IN (?) AND docID IN (?)
      `;
      const [person2documentResults] = await promisePool.query(
        person2documentQuery,
        [personIDsArray, documentIDsArray]
      );

      person2documentResults.forEach((connection) => {
        const key = `person_${connection.personID}-document_${connection.docID}`;
        edgesMap.set(key, {
          from: `person_${connection.personID}`,
          to: `document_${connection.docID}`,
          role: connection.roleID,
          type:
            connection.roleID === 1
              ? 'sender'
              : connection.roleID === 2
              ? 'receiver'
              : connection.roleID === 3
              ? 'mentioned'
              : connection.roleID === 4
              ? 'author'
              : connection.roleID === 5
              ? 'waypoint'
              : undefined,
          ...connection,
        });
      });
    }

    // Fetch person-to-person relationships
    if (personIDs.size > 0) {
      const personIDsArray = Array.from(personIDs);

      const relationshipsQuery = `
        SELECT
          r.relationshipID,
          r.person1ID,
          r.person2ID,
          COALESCE(rt1.relationshipDesc, 'Unknown') AS relationship1to2Desc,
          COALESCE(rt2.relationshipDesc, 'Unknown') AS relationship2to1Desc,
          r.dateStart,
          r.dateEnd,
          r.uncertain,
          r.dateEndCause,
          r.relationship1to2ID,
          r.relationship2to1ID
        FROM
          relationship r
        LEFT JOIN
          relationshiptype rt1 ON r.relationship1to2ID = rt1.relationshiptypeID
        LEFT JOIN
          relationshiptype rt2 ON r.relationship2to1ID = rt2.relationshiptypeID
        WHERE
          r.person1ID IN (?) AND r.person2ID IN (?)
        ORDER BY relationshipID;
      `;
      const [relationshipsResults] = await promisePool.query(
        relationshipsQuery,
        [personIDsArray, personIDsArray]
      );

      relationshipsResults.forEach((relationship) => {
        const key = `person_${relationship.person1ID}-person_${relationship.person2ID}`;
        edgesMap.set(key, {
          from: `person_${relationship.person1ID}`,
          to: `person_${relationship.person2ID}`,
          type: 'relationship',
          relationship1to2Desc: relationship.relationship1to2Desc || 'Unknown',
          relationship2to1Desc: relationship.relationship2to1Desc || 'Unknown',
          dateStart: relationship.dateStart || 'N/A',
          dateEnd: relationship.dateEnd || 'N/A',
          ...relationship,
        });
      });
    }

    // Fetch person-to-organization edges
    if (personIDs.size > 0 && organizationIDs.size > 0) {
      const personIDsArray = Array.from(personIDs);
      const organizationIDsArray = Array.from(organizationIDs);

      const person2organizationQuery = `
        SELECT *
        FROM person2organization
        WHERE personID IN (?) AND organizationID IN (?)
      `;
      const [person2organizationResults] = await promisePool.query(
        person2organizationQuery,
        [personIDsArray, organizationIDsArray]
      );

      person2organizationResults.forEach((connection) => {
        const key = `person_${connection.personID}-organization_${connection.organizationID}`;
        edgesMap.set(key, {
          from: `person_${connection.personID}`,
          to: `organization_${connection.organizationID}`,
          type: 'organization',
          ...connection,
        });
      });
    }

    // Fetch person-to-religion edges
    if (personIDs.size > 0 && religionIDs.size > 0) {
      const personIDsArray = Array.from(personIDs);
      const religionIDsArray = Array.from(religionIDs);

      const person2religionQuery = `
        SELECT *
        FROM person2religion
        WHERE personID IN (?) AND religionID IN (?)
      `;
      const [person2religionResults] = await promisePool.query(
        person2religionQuery,
        [personIDsArray, religionIDsArray]
      );

      person2religionResults.forEach((connection) => {
        const key = `person_${connection.personID}-religion_${connection.religionID}`;
        edgesMap.set(key, {
          from: `person_${connection.personID}`,
          to: `religion_${connection.religionID}`,
          type: 'religion',
          ...connection,
        });
      });
    }

    // **Finalize edges array**
    const edges = Array.from(edgesMap.values());

    res.json(edges);
  } catch (error) {
    console.error('Error running edges-query:', error);
    res.status(500).send('Internal Server Error');
  }
});





module.exports = router;
