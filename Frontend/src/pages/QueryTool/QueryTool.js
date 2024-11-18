import React, { useState, useRef, useEffect } from "react";
import { Dropdown } from "primereact/dropdown";
import "./QueryTool.css";
import { TabView, TabPanel } from "primereact/tabview";
import { FloatLabel } from "primereact/floatlabel";
import { InputText } from "primereact/inputtext";
import { OverlayPanel } from "primereact/overlaypanel";
import { ToggleButton } from "primereact/togglebutton";
import axios from "axios";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { ProgressSpinner } from "primereact/progressspinner";
import { MultiSelect } from "primereact/multiselect";
import QueryGraph from "../../components/querytool/QueryGraph";
import { InputIcon } from "primereact/inputicon";
import { IconField } from "primereact/iconfield";
import fetchGraphData from "../../components/graph/GraphData";
import { Tooltip } from "primereact/tooltip";
import { Toast } from "primereact/toast";

const QueryTool = () => {
  // Existing state variables
  const [value, setValue] = useState([20, 80]);
  const op = useRef(null);
  const [checked, setChecked] = useState(true);
  const [fields, setFields] = useState([]);
  const [filteredFields, setFilteredFields] = useState([]);
  const [selectedView, setSelectedView] = useState(null);
  const [selectedField, setSelectedField] = useState(null);
  const [splitButtonLabel, setSplitButtonLabel] = useState("In");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [queryNodes, setQueryNodes] = useState([]);
  const [queryEdges, setQueryEdges] = useState([]);
  const [sections, setSections] = useState([
    { id: Date.now(), selectedValue: "" },
  ]);
  const [activeIndex, setActiveIndex] = useState(0);
  const previousIndex = useRef(0);
  const [queryData, setQueryData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [filters, setFilters] = useState(null);
  const [currentTable, setCurrentTable] = useState("person");
  const [graphData, setGraphData] = useState(null);
  const [expandedRows, setExpandedRows] = useState({});
  const toast = useRef(null);

  // New state for history management
  const [tableHistory, setTableHistory] = useState([]);

  const [views, setViews] = useState([
    { label: "Person", value: "person" },
    { label: "Organization", value: "organization" },
    { label: "Place", value: "place" },
    { label: "Religion", value: "religion" },
    { label: "Document", value: "document" },
  ]);

  const boolItems = [
    { label: "Equals", value: "equals" },
    { label: "Not Equals", value: "not_equals" },
    { label: "Like", value: "like" },
    { label: "Not Like", value: "not_like" },
    { label: "Greater Than", value: "greater_than" },
    { label: "Less Than", value: "less_than" },
    { label: "Greater Than or Equal", value: "greater_than_or_equal" },
    { label: "Less Than or Equal", value: "less_than_or_equal" },
  ];

  const actionItems = [
    { label: "And", value: "and" },
    { label: "Or", value: "or" },
    { label: "Remove", value: "remove" },
  ];

  const firstActionItems = [
    { label: "And", value: "and" },
    { label: "Or", value: "or" },
  ];

  const relatedEntitiesMap = {
    person: ["document", "religion", "organization"],
    organization: ["person", "religion", "document"],
    religion: ["person", "organization"],
    document: ["person", "organization"],
  };

  const truncateText = (text, rowId, field) => {
    if (!text) return "";
    if (text.length > 200) {
      const isExpanded = expandedRows[`${rowId}-${field}`];
      return (
        <>
          {isExpanded ? text : `${text.substring(0, 100)}...`}
          <span
            className="show-more"
            onClick={() => toggleExpand(rowId, field)}
          >
            {isExpanded ? "Show Less" : "Show More"}
          </span>
        </>
      );
    }
    return text;
  };

  const toggleExpand = (rowId, field) => {
    setExpandedRows((prev) => ({
      ...prev,
      [`${rowId}-${field}`]: !prev[`${rowId}-${field}`],
    }));
  };

  // Function to push current state to history before updating
  const pushToHistory = () => {
    setTableHistory((prev) => {
      const newHistory = [
        ...prev,
        {
          queryData,
          selectedView,
          currentTable,
          selectedOrder,
          visibleColumns,
          filters,
          globalFilter,
        },
      ];
      // Optional: Limit history to last 10 entries to prevent excessive memory usage
      if (newHistory.length > 10) {
        newHistory.shift();
      }
      return newHistory;
    });
  };

  // Function to handle going back to previous state
  const goBack = () => {
    if (tableHistory.length === 0) return;

    const lastState = tableHistory[tableHistory.length - 1];
    setQueryData(lastState.queryData);
    setSelectedView(lastState.selectedView);
    setCurrentTable(lastState.currentTable);
    setSelectedOrder(lastState.selectedOrder);
    setVisibleColumns(lastState.visibleColumns);
    setFilters(lastState.filters);
    setGlobalFilter(lastState.globalFilter);
    setTableHistory((prev) => prev.slice(0, -1));
  };

  const handleButtonClick = async (rowData, entityType, currentTable) => {
    try {
      setLoading(true);
      const baseExpressUrl = process.env.REACT_APP_BASEEXPRESSURL;
      let table1;

      // Determine the appropriate filter field based on the entity type
      let body;

      console.log("Current Table:", currentTable);

      switch (currentTable) {
        case "person":
          console.log("Person: ");
          table1 = currentTable + "2" + entityType;
          if (entityType === "document") {
            body = {
              tables: [table1, entityType],
              fields: ["docID", currentTable + "ID"],
              operators: ["="],
              values: [rowData.personID],
              dependentFields: [entityType + "ID"],
            };
          } else {
            body = {
              tables: [table1, entityType],
              fields: [entityType + "ID", currentTable + "ID"],
              operators: ["="],
              values: [rowData.personID],
              dependentFields: [entityType + "ID"],
            };
          }
          break;
        case "organization":
          if (entityType === "person") {
            table1 = entityType + "2" + currentTable;
            body = {
              tables: [table1, entityType],
              fields: [entityType + "ID", currentTable + "ID"],
              operators: ["="],
              values: [rowData.organizationID],
              dependentFields: [entityType + "ID"],
            };
          } else if (entityType === "document") {
            table1 = currentTable + "2" + entityType;
            body = {
              tables: [table1, entityType],
              fields: ["docID", currentTable + "ID"],
              operators: ["="],
              values: [rowData.organizationID],
              dependentFields: [entityType + "ID"],
            };
          } else {
            table1 = currentTable + "2" + entityType;
            body = {
              tables: [table1, entityType],
              fields: [entityType + "ID", currentTable + "ID"],
              operators: ["="],
              values: [rowData.organizationID],
              dependentFields: [entityType + "ID"],
            };
          }
          break;
        case "religion":
          table1 = entityType + "2" + currentTable;
          body = {
            tables: [table1, entityType],
            fields: [entityType + "ID", currentTable + "ID"],
            operators: ["="],
            values: [rowData.religionID],
            dependentFields: [entityType + "ID"],
          };
          break;

        case "document":
          table1 = entityType + "2" + currentTable;
          body = {
            tables: [table1, entityType],
            fields: [entityType + "ID", "docID"],
            operators: ["="],
            values: [rowData.documentID],
            dependentFields: [entityType + "ID"],
          };
          break;
        default:
          body = null;
      }

      const response = await axios.post(`${baseExpressUrl}knex-query`, body);
      console.log("Response", response.data);

      if (response.data.rows.length === 0) {
        toast.current.show({
          severity: "info",
          summary: "No Results",
          detail: `No ${entityType} found for this ${currentTable}`,
          life: 3000,
        });
        // Do not save to history if no data is returned
      } else {
        // Push current state to history **only if new data is available**
        pushToHistory();

        setQueryData(response.data.rows);
        setSelectedView(entityType);
        setCurrentTable(entityType);
      }
    } catch (error) {
      console.log(error);
      toast.current.show({
        severity: "error",
        summary: "Error",
        detail: "An error occurred while fetching data.",
        life: 3000,
      });
    } finally {
      setLoading(false);
    }
  };

  // const actionBodyTemplate = (rowData) => {
  //   const relatedEntities = relatedEntitiesMap[selectedView] || [];
  //   return relatedEntities.map((entity, index) => (
  //     <Column
  //       key={index}
  //       header={entity.charAt(0).toUpperCase() + entity.slice(1)}
  //       body={(rowData) => (
  //         <span
  //           style={{
  //             color: "#ADD8E6",
  //             textDecoration: "underline",
  //             cursor: "pointer",
  //           }}
  //           onClick={() => handleButtonClick(rowData, entity, currentTable)}
  //         >
  //           {entity.charAt(0).toUpperCase() + entity.slice(1)}
  //         </span>
  //       )}
  //     />
  //   ));
  // };

  const updateFilteredFields = () => {
    let filtered = [];
    if (selectedView === "person") {
      filtered = fields.filter((view) => view.view === "person");
    } else if (selectedView === "organization") {
      filtered = fields.filter((view) => view.view === "organization");
    } else if (selectedView === "place") {
      filtered = fields.filter((view) => view.view === "place");
    } else if (selectedView === "religion") {
      filtered = fields.filter((view) => view.view === "religion");
    } else if (selectedView === "document") {
      filtered = fields.filter((view) => view.view === "document");
    }
    setFilteredFields(filtered);
    setVisibleColumns(filtered);
    setSelectedField(null);
    setSplitButtonLabel("In");
  };

  const updateFields = (e) => {
    setSelectedView(e.value);
    setCurrentTable(e.value);
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const baseExpressUrl = process.env.REACT_APP_BASEEXPRESSURL;
        const response = await axios.get(`${baseExpressUrl}query-tool-fields`);
        setFields(response.data);
      } catch (error) {
        console.log(error);
        toast.current.show({
          severity: "error",
          summary: "Error",
          detail: "Failed to fetch fields.",
          life: 3000,
        });
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    console.log(fields);
  }, [fields]);

  useEffect(() => {
    updateFilteredFields();
    if (selectedView) {
      // Optionally, you can fetch initial data for the selectedView here
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedView, fields]);

  const addNewSection = () => {
    setSections([...sections, { id: Date.now(), selectedValue: "" }]);
  };

  const removeSection = (id) => {
    if (sections.length === 1 || sections[0].id === id) {
      return;
    }
    setSections(sections.filter((section) => section.id !== id));
  };

  const onTabChange = (e) => {
    const newIndex = e.index;
    const oldIndex = previousIndex.current;
    console.log("Tab changed");
    // Assuming "Query" is index 0 and "Table" is index 3
    if (
      (oldIndex === 0 && newIndex === 3) ||
      (oldIndex === 0 && newIndex === 1)
    ) {
      const fetchData = async () => {
        try {
          setLoading(true);
          const body = {
            tables: [selectedView],
            fields: sections.map((section) =>
              section.selectedField ? section.selectedField.field : null
            ),
            operators: sections.map((section) =>
              section.selectedParameter
                ? {
                    equals: "=",
                    not_equals: "!=",
                    like: "LIKE",
                    not_like: "NOT LIKE",
                    greater_than: ">",
                    less_than: "<",
                    greater_than_or_equal: ">=",
                    less_than_or_equal: "<=",
                  }[section.selectedParameter]
                : null
            ),
            values: sections.map((section) => section.selectedValue),
            dependentFields: sections.map((section) => section.selectedAction),
          };
          const baseExpressUrl = process.env.REACT_APP_BASEEXPRESSURL;
          const response = await axios.post(
            `${baseExpressUrl}knex-query`,
            body
          );
          const graphResults = await fetchGraphData(
            `${baseExpressUrl}knex-query`,
            2000,
            0,
            body
          );

          console.log("Response", response.data, response.data.rows);

          if (response.data.rows.length > 0) {
            // Push current state to history only if new data is available
            pushToHistory();

            setQueryData(response.data.rows);
            setGraphData(graphResults);
          } else {
            toast.current.show({
              severity: "info",
              summary: "No Results",
              detail: `No ${selectedView} found for this query.`,
              life: 3000,
            });
          }
        } catch (error) {
          console.log(error);
          toast.current.show({
            severity: "error",
            summary: "Error",
            detail: "An error occurred while fetching data.",
            life: 3000,
          });
        } finally {
          setLoading(false);
        }
      };
      fetchData();
    }

    setActiveIndex(newIndex);
    previousIndex.current = newIndex;
  };

  useEffect(() => {
    console.log("Query Data Updated:", queryData);
  }, [queryData]);

  useEffect(() => {
    if (filteredFields.length > 0) {
      setVisibleColumns(filteredFields);
    }
  }, [filteredFields]);

  const onColumnToggle = (event) => {
    let selectedColumns = event.value;
    let orderedSelectedColumns = filteredFields.filter((col) =>
      selectedColumns.some((sCol) => sCol.field === col.field)
    );
    setVisibleColumns(orderedSelectedColumns);
  };

  const onFilter = (e) => {
    setFilters(e.filters);
    sessionStorage.setItem("query-tool-filters", JSON.stringify(e.filters));
  };

  const onGlobalFilterChange = (e) => {
    const value = e.target.value;
    setGlobalFilter(value);
    sessionStorage.setItem("query-tool-globalFilter", value);
  };

  const renderHeader = () => {
    return (
      <div className="table-header">
        {/* Back Button */}
        {tableHistory.length > 0 && (
          <button
            className="back-button mr-4"
            onClick={goBack}
            aria-label="Go Back"
            title="Go Back"
          >
            <i className="left-arrow pi pi-arrow-left"></i>
            Previous Table
          </button>
        )}
        <span className="p-input-icon-left">
          <IconField iconPosition="left">
            <InputIcon className="pi pi-search"> </InputIcon>
            <InputText
              type="search"
              value={globalFilter}
              onChange={onGlobalFilterChange}
              placeholder="Global Search"
            />
          </IconField>
        </span>

        <MultiSelect
          value={visibleColumns}
          options={filteredFields}
          optionLabel="field"
          onChange={onColumnToggle}
          className="w-full sm:w-20rem ml-4"
        />
      </div>
    );
  };
  const header = renderHeader();

  return (
    <div className="query-tool-container">
      <Toast ref={toast} />
      <div className="title-container">
        <h1>Query Tool</h1>
      </div>

      <div className="query-container">
        <TabView
          className="query-tool"
          activeIndex={activeIndex}
          onTabChange={onTabChange}
        >
          <TabPanel
            header="Query"
            leftIcon="pi pi-search mr-2"
            className="query-tab-panel"
          >
            <div className="query-section">
              <h3>Search for:</h3>
              <Dropdown
                tooltip="Select a table to search for" 
               value={selectedView}
                onChange={(e) => updateFields(e)}
                options={views}
                optionLabel="label"
                placeholder="Parameters"
                filter
                className="w-full md:w-14rem"
              />
            </div>
            {sections.map((section, index) => (
              <div key={section.id} className="query-section">
                <h3>Where:</h3>
                <div className="query-input">
                  <Dropdown
                    tooltip="Select a field to search within" 
                    value={section.selectedField}
                    onChange={(e) => {
                      const newSections = [...sections];
                      newSections[index].selectedField = e.value;
                      setSections(newSections);
                    }}
                    options={filteredFields}
                    optionLabel="field"
                    placeholder="Parameters"
                    filter
                    className="w-full md:w-14rem"
                    disabled={filteredFields?.length === 0}
                  />
                  <Dropdown
                    tooltip="Select an operator"     
                   value={section.selectedParameter}
                    onChange={(e) => {
                      const newSections = [...sections];
                      newSections[index].selectedParameter = e.value;
                      setSections(newSections);
                    }}
                    options={boolItems}
                    optionLabel="label"
                    placeholder="Parameters"
                    className="w-full md:w-14rem"
                  />
                  <FloatLabel>
                    <InputText
                      tooltip="Enter a value"
                      value={section.selectedValue}
                      onChange={(e) => {
                        const newSections = [...sections];
                        newSections[index].selectedValue = e.target.value;
                        setSections(newSections);
                      }}
                    />
                    <label htmlFor="username">Value</label>
                  </FloatLabel>
                  <Dropdown
                    tooltip="(Optional)"
                    value={section.selectedAction}
                    onChange={(e) => {
                      const newSections = [...sections];
                      newSections[index].selectedAction = e.value;
                      setSections(newSections);
                      if (
                        index === newSections.length - 1 &&
                        (e.value === "and" || e.value === "or")
                      ) {
                        addNewSection();
                      } else if (e.value === "remove") {
                        if (index === newSections.length - 1) {
                          sections[index - 1].selectedAction = null;
                        }
                        removeSection(section.id);
                      }
                    }}
                    options={index !== 0 ? actionItems : firstActionItems}
                    optionLabel="label"
                    placeholder="Select Action"
                    className="w-full md:w-14rem"
                  />
                </div>
              </div>
            ))}

            {/* <div className="query-section">
              <h3>Order by:</h3>
              <div className="query-input">
                <Dropdown
                  tooltip="Message to display"
                  value={selectedOrder}
                  onChange={(e) => setSelectedOrder(e.value)}
                  options={filteredFields}
                  optionLabel="field"
                  placeholder="Parameters"
                  filter
                  className="w-full md:w-14rem"
                  disabled={filteredFields?.length === 0}
                />
                <ToggleButton
                  onLabel="Ascending"
                  offLabel="Descending"
                  onIcon="pi pi-arrow-up"
                  offIcon="pi pi-arrow-down"
                  tooltip="Message about order"
                  checked={checked}
                  onChange={(e) => setChecked(e.value)}
                />
              </div>
            </div> */}
          </TabPanel>
          <TabPanel header="Network" leftIcon="pi pi-user mr-2">
            <QueryGraph
              nodesUrl={process.env.REACT_APP_BASEEXPRESSURL + "nodes-query"}
              edgesUrl={process.env.REACT_APP_BASEEXPRESSURL + "edges-query"}
              body={{
                tables: [selectedView],
                fields: sections.map((section) =>
                  section.selectedField ? section.selectedField.field : null
                ),
                operators: sections.map((section) =>
                  section.selectedParameter
                    ? {
                        equals: "=",
                        not_equals: "!=",
                        like: "LIKE",
                        not_like: "NOT LIKE",
                        greater_than: ">",
                        less_than: "<",
                        greater_than_or_equal: ">=",
                        less_than_or_equal: "<=",
                      }[section.selectedParameter]
                    : null
                ),
                values: sections.map((section) => section.selectedValue),
                dependentFields: sections.map(
                  (section) => section.selectedAction
                ),
              }}
            />
          </TabPanel>
          <TabPanel header="Map" leftIcon="pi pi-map-marker mr-2">
            <p className="m-0">
              {/* iframe for mapping website */}
              <iframe
                title="Map"
                style={{ width: "100%", height: "80vh" }}
                src="https://chdr.cs.ucf.edu/print_map"
                allowFullScreen
                loading="lazy"
              ></iframe>
            </p>
          </TabPanel>
          <TabPanel header="Table" leftIcon="pi pi-table mr-2">
            {loading ? (
              <div className="spinner-wrapper">
                <ProgressSpinner />
              </div>
            ) : (
              queryData && (
                <DataTable
                  value={queryData}
                  size={"small"}
                  style={{ maxWidth: "80vw" }}
                  paginator
                  rows={10}
                  rowsPerPageOptions={[5, 10, 25, 50]}
                  paginatorTemplate="RowsPerPageDropdown FirstPageLink PrevPageLink CurrentPageReport NextPageLink LastPageLink"
                  currentPageReportTemplate="{first} to {last} of {totalRecords}"
                  header={header}
                  showGridlines
                  stripedRows
                  scrollable
                  scrollHeight="45vh"
                  resizableColumns
                  reorderableColumns
                  globalFilter={globalFilter}
                  filters={filters}
                  onFilter={onFilter}
                >
                  {visibleColumns.slice(0, 3).map((fieldObj, index) => (
                    <Column
                      key={index}
                      field={fieldObj.field}
                      header={fieldObj.field}
                      sortable
                      filter
                      filterPlaceholder={`Search by ${fieldObj.field}`}
                      body={(rowData) => (
                        <span>
                          {truncateText(
                            rowData[fieldObj.field],
                            rowData.id,
                            fieldObj.field
                          )}
                        </span>
                      )}
                    />
                  ))}

                  {relatedEntitiesMap[selectedView]?.map((entity, index) => (
                    <Column
                      key={`related-${index}`}
                      header={entity.charAt(0).toUpperCase() + entity.slice(1)}
                      body={(rowData) => (
                        <span
                          className="action-link"
                          onClick={() =>
                            handleButtonClick(rowData, entity, currentTable)
                          }
                        >
                          {entity.charAt(0).toUpperCase() + entity.slice(1)}
                        </span>
                      )}
                    />
                  ))}

                  {visibleColumns.slice(3).map((fieldObj, index) => (
                    <Column
                      key={index + 3}
                      field={fieldObj.field}
                      header={fieldObj.field}
                      sortable
                      filter
                      filterPlaceholder={`Search by ${fieldObj.field}`}
                      body={(rowData) => (
                        <span>
                          {truncateText(
                            rowData[fieldObj.field],
                            rowData.id,
                            fieldObj.field
                          )}
                        </span>
                      )}
                    />
                  ))}
                </DataTable>
              )
            )}
            <Tooltip target="span[data-pr-tooltip]" />
          </TabPanel>
        </TabView>
      </div>
      <i
        className="pi pi-question-circle help-icon"
        onClick={(e) => op.current.toggle(e)}
      ></i>
      <OverlayPanel
        ref={op}
        appendTo={document.body}
        className="custom-overlay-panel bottom-right-overlay"
      >
        <div>
          <p>
            The Query Tool allows you to search for information in the database
            using a variety of parameters. You can search for information about
            people, organizations, places, religions, and documents. You can
            also view the search results in a table, network graph, or map.
          </p>
          {/* Additional instructions on how to use it */}
          <p>
            To use the Query Tool, select the type of information you want to
            search for from the dropdown menu. Then, add search parameters by
            selecting a field, operator, and value. You can add multiple search
            parameters by clicking the "Add" button. You can also specify the
            order in which the search results are displayed by selecting a field
            to order by and choosing between ascending or descending order.
          </p>
        </div>
      </OverlayPanel>
    </div>
  );
};

export default QueryTool;
