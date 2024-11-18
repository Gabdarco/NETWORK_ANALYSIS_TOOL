import React, { useEffect, useState } from "react";
import { MultiSelect } from "primereact/multiselect";
import "./Filter.css";

const Filter = ({ onFilterChange, options, filters }) => {
  const [selectedFilters, setSelectedFilters] = useState(filters || []);

  const handleFilterChange = (filter) => {
    filter = filter.filter((f) => options.includes(f));
    console.log(filter);
    setSelectedFilters(filter);
    onFilterChange(filter);
  };

  return (
    <MultiSelect
      value={selectedFilters}
      onChange={(e) => handleFilterChange(e.value)}
      options={options}
      optionLabel="name"
      filter
      placeholder="Select Filters"
      className="filter"
    />
  );
};

export default Filter;
