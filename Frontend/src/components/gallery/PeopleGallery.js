import React from "react";
import { Card } from "primereact/card";

const PeopleGallery = ({ people, filters, handleButtonClick }) => {
  console.log(people);
  const flist = filters || [];

  const capitalizeFirstLetter = (string) => {
    return string.charAt(0).toUpperCase() + string.slice(1);
  };

  const createPersonCard = (person) => {
    const name =
      capitalizeFirstLetter(person.firstName) +
      " " +
      capitalizeFirstLetter(person.lastName);
    let religion = person.religion;
    if (!religion) {
      religion = "No religion available";
    } else {
      religion = capitalizeFirstLetter(religion);
    }

    let bio = person.biography;
    if (!bio) {
      bio = "No bio available";
    }

    let org = person.organization;
    if (!org) {
      org = "No organization available";
    } else {
      org = org.split(",").join(", ");
    }

    return (
      <div
        key={person.personID}
        className="gallery-item"
        onClick={() => handleButtonClick(person)}
      >
        <Card className="gallery-card">
          <div className="gallery-text">
            <div className="gallery-title">{name}</div>
            <div className="gallery-subtitle">{religion}</div>
            <div className="gallery-subtitle">{org}</div>
            {/* <div className="gallery-bio">{bio}</div> */}
          </div>
        </Card>
      </div>
    );
  };

  return (
    <div className="gallery">
      {people
        .filter(
          (person) =>
            flist.length === 0 ||
            flist.some((filter) =>
              `${person.firstName} ${person.lastName} ${person.religion} ${person.organization}`
                .toLowerCase()
                .includes(filter.code.toLowerCase())
            )
        )
        .map((person) => createPersonCard(person))}
    </div>
  );
};

export default PeopleGallery;