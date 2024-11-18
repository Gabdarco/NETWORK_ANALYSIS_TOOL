import React, { useState, useEffect, useRef } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { InputText } from 'primereact/inputtext';
import { Button } from 'primereact/button';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { Document, Packer, Paragraph, Table, TableCell, TableRow } from 'docx';
import { Toolbar } from 'primereact/toolbar';
import { InputIcon } from 'primereact/inputicon';
import { IconField } from 'primereact/iconfield';
import './LettersTable.css';

export default function Mentions({ nodeData, onRowClick }) {
    const [documents, setDocuments] = useState([]);
    const [globalFilter, setGlobalFilter] = useState(''); 
    const [filters, setFilters] = useState(null); // Add filter state
    const [filteredData, setFilteredData] = useState([]); // Add filtered data state
    const dt = useRef(null);

    // Function to retrieve filtered data from the table
    const getFilteredData = () => {
        return filteredData;
    };

    // Download table data as PDF
    const downloadPDF = () => {
        const doc = new jsPDF();
        const tableColumn = ["Sender", "Receiver", "Document ID", "Date"];
        const tableRows = [];
        
        getFilteredData().forEach(doc => {
            const docData = [
                doc.document?.sender || null,
                doc.document?.receiver || null,
                doc.document?.importID || null,
                doc.document?.date || null
            ];
            tableRows.push(docData);
        });

        doc.autoTable(tableColumn, tableRows, { startY: 20 });
        doc.text("Document Table", 14, 15);
        doc.save('table.pdf');
    };

    // Download table data as Excel
    const downloadExcel = () => {
        const filteredData = getFilteredData().map(doc => ({
            Sender: doc.document?.sender || 'Sender not found',
            Receiver: doc.document?.receiver || 'Receiver not found',
            DocumentID: doc.document?.importID || 'ID not found',
            Date: doc.document?.date || 'Date not found'
        }));
    
        const worksheet = XLSX.utils.json_to_sheet(filteredData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
        XLSX.writeFile(workbook, 'table.xlsx');
    };

    // Download table data as Word
    const downloadWord = () => {
        const table = new Table({
            rows: [
                new TableRow({
                    children: [
                        new TableCell({ children: [new Paragraph('Sender')] }),
                        new TableCell({ children: [new Paragraph('Receiver')] }),
                        new TableCell({ children: [new Paragraph('Document ID')] }),
                        new TableCell({ children: [new Paragraph('Date')] }),
                    ],
                }),
                ...getFilteredData().map(doc => new TableRow({
                    children: doc.document ? [
                        new TableCell({ children: [new Paragraph(doc.document.sender || 'Sender not found')] }),
                        new TableCell({ children: [new Paragraph(doc.document.receiver || 'Receiver not found')] }),
                        new TableCell({ children: [new Paragraph(String(doc.document.importID) || 'ID not found')] }),
                        new TableCell({ children: [new Paragraph(doc.document.date || 'Date not found')] }),
                    ] : [
                        new TableCell({ children: [new Paragraph('')] }),
                        new TableCell({ children: [new Paragraph('')] }),
                        new TableCell({ children: [new Paragraph('')] }),
                        new TableCell({ children: [new Paragraph('')] }),
                    ],
                })),
            ],
        });
    
        const doc = new Document({
            sections: [{ children: [table] }],
        });
    
        Packer.toBlob(doc).then(blob => {
            saveAs(blob, 'table.docx');
        });
    };
    // Fetch data when the component is mounted
    useEffect(() => {
        console.log(nodeData);
        if (nodeData && nodeData.documents) {
            setDocuments(nodeData.documents);
            setFilteredData(nodeData.documents);
        }
    }, [nodeData]);

    // Load filters from session storage when component mounts
   // Load filters and global filter from session storage when component mounts
   useEffect(() => {

    const savedFilters = sessionStorage.getItem('mentions-table-filters');
    if (savedFilters) {
        setFilters(JSON.parse(savedFilters));
    }
    
    const savedGlobalFilter = sessionStorage.getItem('mentions-table-globalFilter');
    if (savedGlobalFilter) {
        setGlobalFilter(savedGlobalFilter);
    }
}, []);

// Save filters to session storage whenever they are updated
const onFilter = (e) => {
    setFilters(e.filters); // Update state
    sessionStorage.setItem('mentions-table-filters', JSON.stringify(e.filters)); // Save to sessionStorage
};

// Save global filter value to session storage when it changes
const onGlobalFilterChange = (e) => {
    const value = e.target.value;

        setGlobalFilter(value); // Apply the filter
        sessionStorage.setItem('mentions-table-globalFilter', value); // Save the filter to sessionStorage
};

// Function to render header with global search and export buttons
const renderHeader = () => {
    const leftContents = (
        <span className="p-input-icon-left">
            <IconField iconPosition="left">
                <InputIcon className="pi pi-search"> </InputIcon>
                <InputText 
                    type="search"
                    value={globalFilter} // Ensure global filter input shows the correct value
                    onChange={onGlobalFilterChange} // Update on change
                    placeholder="Global Search"
                />
            </IconField>
        </span>
    );

    const rightContents = (
        <>
            <Button label="Download PDF" icon="pi pi-file-pdf" onClick={downloadPDF} className="p-button-danger" style={{ width: '150px' ,marginRight:'8px'}} />
            <Button label="Download Excel" icon="pi pi-file-excel" onClick={downloadExcel} className="p-button-success" style={{ width: '150px' ,marginRight:'8px'}} />
            <Button label="Download Word" icon="pi pi-file-word" onClick={downloadWord} className="p-button-primary" style={{ width: '150px', marginRight:'8px' }} />
        </>
    );

    return (
        <Toolbar left={leftContents} right={rightContents} />
    );
};
    const header = renderHeader();

    // Function to handle row click
    const handleRowClick = (e) => {
        if (typeof onRowClick === 'function') {
            onRowClick(e.data);
        } else {
            console.error('onRowClick is not a function');
        }
    };

    return (
        <div>
            <DataTable
                ref={dt}
                value={documents}
                paginator
                rows={10}
                responsiveLayout="scroll"
                globalFilter={globalFilter}
                filters={filters} // Set filters from state
                header={header}
                onRowClick={handleRowClick}
                stateStorage="session" // Saves state to sessionStorage
                stateKey="mentions-table-state" // Unique key for this table's state
                className="custom-datatable"
                onFilter={onFilter} // Set the onFilter callback
                onValueChange={filteredData => setFilteredData(filteredData)} // Update filtered data state
            >
                <Column
                    field="document.sender"
                    header="Sender"
                    sortable
                    filter
                    filterPlaceholder="Search by sender"
                ></Column>
                <Column
                    field="document.receiver"
                    header="Receiver"
                    sortable
                    filter
                    filterPlaceholder="Search by receiver"
                ></Column>
                <Column
                    field="document.importID"
                    header="Document ID"
                    sortable
                    filter
                    filterPlaceholder="Search by document ID"
                ></Column>
                <Column
                    field="document.date"
                    header="Date"
                    sortable
                    filter
                    filterPlaceholder="Search by date"
                    body={(rowData) => (rowData.document.date ? rowData.document.date : 'Date not Found')}
                ></Column>
            </DataTable>
        </div>
    );
}