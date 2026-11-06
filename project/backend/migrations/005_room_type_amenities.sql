-- Room-level and room-type-level amenities have independent associations.
CREATE TABLE IF NOT EXISTS room_type_amenities (
  room_types_id INT NOT NULL,
  amenity_id INT NOT NULL,
  PRIMARY KEY (room_types_id, amenity_id),
  CONSTRAINT fk_room_type_amenities_type FOREIGN KEY (room_types_id) REFERENCES room_types(id) ON DELETE CASCADE,
  CONSTRAINT fk_room_type_amenities_amenity FOREIGN KEY (amenity_id) REFERENCES amenities(id) ON DELETE CASCADE
) ENGINE=InnoDB;
