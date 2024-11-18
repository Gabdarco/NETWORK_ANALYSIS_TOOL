import React, { useState, useEffect } from "react";

import { Dialog } from "primereact/dialog";
import { TabView, TabPanel } from "primereact/tabview";
import Sidecar from "../../components/sidecar/Sidecar";
import Filter from "../../components/gallery/galleryFilter/Filter";
import DocumentsGallery from "../../components/gallery/DocumentGallery";
import PeopleGallery from "../../components/gallery/PeopleGallery";
import "./Gallery.css";

const Gallery = ({ searchQuery }) => {
  // Variables for the gallery
  const [people, setPeople] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [dialogs, setDialogs] = useState([]);
  const [docDialogs, setDocDialogs] = useState([]);
  const [filters, setFilters] = useState([]);
  const [peopleFilters, setPeopleFilters] = useState([]);
  const [docFilters, setDocFilters] = useState([]);
  const [filterOptions, setFilterOptions] = useState([]);
  const [PeopleFilterOptions, setPeopleFilterOptions] = useState([]);
  const [DocFilterOptions, setDocFilterOptions] = useState([]);
  const [activeTab, setActiveTab] = useState(0);

  // Fetch people and documents from the API
  useEffect(() => {
    const fetchPeople = async () => {
      try {
        // Fetch people from the API
        const baseExpressUrl = process.env.REACT_APP_BASEEXPRESSURL;
        const response = await fetch(`${baseExpressUrl}persons`);
        const data = await response.json();
        setPeople(data);

        // Person Filters
        const uniqueNames = Array.from(
          new Set(
            data.map(
              (person) =>
                `${capitalizeFirstLetter(
                  person.firstName
                )} ${capitalizeFirstLetter(person.lastName)}`
            )
          )
        );
        const filterNames = uniqueNames.map((name) => ({
          name: name,
          code: name,
        }));

        const uniqueReligions = Array.from(
          new Set(data.map((person) => person.religion))
        );
        const filterReligions = uniqueReligions.map((religion) => ({
          name: religion,
          code: religion,
        }));

        const uniqueOrganizations = [];
        data.forEach((person) => {
          const org = person.organization;
          if (org) {
            org.split(",").forEach((organization) => {
              if (!uniqueOrganizations.includes(organization)) {
                uniqueOrganizations.push(organization);
              }
            });
          }
        });
        const filterOrganizations = uniqueOrganizations.map((organization) => ({
          name: organization,
          code: organization,
        }));

        const peopleFilterOptions = filterNames
          .concat(filterReligions)
          .concat(filterOrganizations);
        setPeopleFilterOptions(peopleFilterOptions);

        // Fetch documents from the API
        const documentRes = await fetch(`${baseExpressUrl}gallery/docs`);
        const documentData = await documentRes.json();
        setDocuments(documentData);

        // Document Filters
        const uniqueDates = Array.from(
          new Set(
            documentData.map((document) =>
              document.sortingDate ? document.sortingDate.slice(0, 4) : null
            )
          )
        );
        const filterDates = uniqueDates.map((date) => ({
          name: date,
          code: date,
        }));
        const docFilterOptions = filterNames.concat(filterDates);
        setDocFilterOptions(docFilterOptions);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };

    fetchPeople();
  }, []);

  // Update filter options based on active tab
  useEffect(() => {
    if (activeTab === 1) {
      setDocFilters(filters);
      setFilters(peopleFilters);
      setFilterOptions(PeopleFilterOptions);
    } else if (activeTab === 0) {
      setPeopleFilters(filters);
      setFilters(docFilters);
      setFilterOptions(DocFilterOptions);
    }
  }, [activeTab, PeopleFilterOptions, DocFilterOptions]);

  const handleButtonClick = async (person) => {
    // Fetch person details from the API for sidecars
    const baseExpressUrl = process.env.REACT_APP_BASEEXPRESSURL;
    const response = await fetch(`${baseExpressUrl}person/${person.personID}`);
    const data = await response.json();
    const documents = [];

    data.documents.forEach((element) => {
      if (element.date == null) {
        element.date = element.sortingDate;
      }
      documents.push({ document: element });
    });

    // Getting the information for the person
    const newDialog = {
      id: person.personID,
      nodeData: {
        data: {
          person: {
            personID: person.personID,
            fullName: `${person.firstName} ${person.lastName}`,
            birthDate: person.birthDate,
            deathDate: person.deathDate,
            biography: person.biography,
            religion: person.religion,
            gender: person.gender,
            LODLOC: data.person[0].LODLOC,
            LODVIAF: data.person[0].LODVIAF,
            LODwikiData: data.person[0].LODwikiData,
            documents: documents,
            relations: data.relations,
            mentions: data.mentions,
          },
        },
        documents: documents,
        relations: data.relations,
        mentions: data.mentions,
      },
    };
    console.log(newDialog);
    setDialogs([...dialogs, newDialog]);
  };

  const handleCloseDialog = (id) => {
    setDialogs(dialogs.filter((dialog) => dialog.id !== id));
  };

  const handleFilterChange = (filters) => {
    setFilters(filters);
  };

  const capitalizeFirstLetter = (string) => {
    return string.charAt(0).toUpperCase() + string.slice(1);
  };

  const onTabChange = (e) => {
    setActiveTab(e.index);
  };

  const handleCloseDocDialog = (id) => {
    setDocDialogs((prevDialogs) =>
      prevDialogs.filter((dialog) => dialog.id !== id)
    );
  };

  return (
    <div>
      <TabView
        activeIndex={activeTab}
        onTabChange={onTabChange}
        className="tabview-custom"
      >
        <TabPanel header="Documents" leftIcon="pi pi-file">
          <Filter
            onFilterChange={handleFilterChange}
            options={DocFilterOptions}
            filters={docFilters}
          />
          <DocumentsGallery
            documents={documents}
            filters={filters}
            setDialogs={setDocDialogs}
          />
        </TabPanel>
        <TabPanel header="People" leftIcon="pi pi-users">
          <Filter
            onFilterChange={handleFilterChange}
            options={PeopleFilterOptions}
            filters={peopleFilters}
          />
          <PeopleGallery
            people={people}
            filters={filters}
            handleButtonClick={handleButtonClick}
          />
        </TabPanel>
      </TabView>
      {dialogs.map((dialog) => (
        <Dialog
          key={dialog.id}
          header={dialog.nodeData.data.person.fullName}
          visible={true}
          onHide={() => handleCloseDialog(dialog.id)}
          draggable={true}
          modal={false}
          maximizable
          style={{ width: "600px", height: "500px" }}
        >
          <Sidecar nodeData={dialog.nodeData} />
        </Dialog>
      ))}
      {docDialogs.map((dialog) => (
        <Dialog
          key={dialog.id}
          header={dialog.nodeData.data.document.title || "Document Details"}
          maximizable
          modal={false}
          visible={true}
          onHide={() => handleCloseDocDialog(dialog.id)}
          style={{
            width: "35vw",
            height: "70vh",
            minWidth: "15vw",
            minHeight: "15vw",
          }}
          breakpoints={{ "960px": "75vw", "641px": "100vw" }}
        >
          <Sidecar nodeData={dialog.nodeData} />
        </Dialog>
      ))}
    </div>
  );
};

export default Gallery;
