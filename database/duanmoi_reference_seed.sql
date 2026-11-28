-- MySQL dump 10.13  Distrib 8.0.46, for Linux (x86_64)
--
-- Host: localhost    Database: duanmoi
-- ------------------------------------------------------
-- Server version	8.0.46

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Dumping data for table `amenities`
--

LOCK TABLES `amenities` WRITE;
/*!40000 ALTER TABLE `amenities` DISABLE KEYS */;
INSERT INTO `amenities` VALUES (1,'Wi-Fi miễn phí','Tiện nghi'),(2,'View biển trực diện','view'),(3,'Yên tĩnh','comfort'),(4,'Điều hòa','Thiết bị'),(5,'TV','Giải trí'),(6,'Phòng tắm riêng','Phòng tắm'),(7,'sàn gỗ','Tiện nghi'),(8,'Cửa sổ lớn','Tiện nghi'),(9,'Rạp chiếu phim','Tiện nghi');
/*!40000 ALTER TABLE `amenities` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `apartment`
--

LOCK TABLES `apartment` WRITE;
/*!40000 ALTER TABLE `apartment` DISABLE KEYS */;
INSERT INTO `apartment` VALUES (1,'Đồi Bông Gòn - CN1: Hải Đăng','Đường Hải Đăng, phường Vũng Tàu, TP. Hồ Chí Minh','0908888888','active','2026-11-11 21:13:08.503662','2026-11-11 21:13:08.503662'),(2,'Đồi Bông Gòn - CN1: Thiền Môn','Đường Trần Phú, phường Vũng Tàu, TP. Hồ Chí Minh','0908888888','active','2026-11-11 21:13:08.514420','2026-11-11 21:13:08.514420'),(3,'Đồi Bông Gòn - CN2: Triền Núi','Đường Vi Ba, phường Vũng Tàu, TP. Hồ Chí Minh','0908888888','active','2026-11-11 21:13:08.519950','2026-11-11 21:13:08.519950');
/*!40000 ALTER TABLE `apartment` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `room_types`
--

LOCK TABLES `room_types` WRITE;
/*!40000 ALTER TABLE `room_types` DISABLE KEYS */;
INSERT INTO `room_types` VALUES (1,'Tiêu chuẩn',1,700000.00,2,'Studio diện tích 26 m² tại Đồi Bông Gòn - CN1: Hải Đăng, bố trí 1 giường King, phù hợp tối đa 2 khách. Các tiện ích đã gồm được liệt kê bên dưới.','1 giường King',26,1,'2026-11-11 21:13:08.533673',30),(2,'Tiêu chuẩn',1,950000.00,3,'Căn hộ một phòng ngủ diện tích 38 m² tại Đồi Bông Gòn - CN1: Hải Đăng, bố trí 1 giường King, 1 Sofa bed, phù hợp tối đa 3 khách. Các tiện ích đã gồm được liệt kê bên dưới.','1 giường King, 1 Sofa bed',38,1,'2026-11-11 21:13:08.541592',31),(3,'Tiêu chuẩn',1,1450000.00,4,'Căn hộ hai phòng ngủ diện tích 55 m² tại Đồi Bông Gòn - CN1: Hải Đăng, bố trí 2 giường Queen, phù hợp tối đa 4 khách. Các tiện ích đã gồm được liệt kê bên dưới.','2 giường Queen',55,1,'2026-11-11 21:13:08.548689',32),(4,'Tiêu chuẩn',1,5000.00,6,'Căn hộ Penthouse diện tích 85 m² tại Đồi Bông Gòn - CN1: Hải Đăng, bố trí 3 giường King, phù hợp tối đa 6 khách. Các tiện ích đã gồm được liệt kê bên dưới.','3 giường King',85,1,'2026-11-11 21:13:08.556079',33),(5,'Tiêu chuẩn',2,600000.00,2,'Studio diện tích 26 m² tại Đồi Bông Gòn - CN1: Thiền Môn, bố trí 1 giường King, phù hợp tối đa 2 khách. Các tiện ích đã gồm được liệt kê bên dưới.','1 giường King',26,1,'2026-11-11 21:13:08.563684',34),(6,'Tiêu chuẩn',2,950000.00,3,'Căn hộ một phòng ngủ diện tích 38 m² tại Đồi Bông Gòn - CN1: Thiền Môn, bố trí 1 giường King, 1 Sofa bed, phù hợp tối đa 3 khách. Các tiện ích đã gồm được liệt kê bên dưới.','1 giường King, 1 Sofa bed',38,1,'2026-11-11 21:13:08.570082',35),(7,'Tiêu chuẩn',2,1450000.00,4,'Căn hộ hai phòng ngủ diện tích 55 m² tại Đồi Bông Gòn - CN1: Thiền Môn, bố trí 2 giường Queen, phù hợp tối đa 4 khách. Các tiện ích đã gồm được liệt kê bên dưới.','2 giường Queen',55,1,'2026-11-11 21:13:08.576005',36),(8,'Tiêu chuẩn',2,2500000.00,6,'Căn hộ Penthouse diện tích 85 m² tại Đồi Bông Gòn - CN1: Thiền Môn, bố trí 3 giường King, phù hợp tối đa 6 khách. Các tiện ích đã gồm được liệt kê bên dưới.','3 giường King',85,1,'2026-11-11 21:13:08.584288',37),(9,'Tiêu chuẩn',3,600000.00,2,'Studio diện tích 26 m² tại Đồi Bông Gòn - CN2: Triền Núi, bố trí 1 giường King, phù hợp tối đa 2 khách. Các tiện ích đã gồm được liệt kê bên dưới.','1 giường King',26,1,'2026-11-11 21:13:08.593795',38),(10,'Tiêu chuẩn',3,950000.00,3,'Căn hộ một phòng ngủ diện tích 38 m² tại Đồi Bông Gòn - CN2: Triền Núi, bố trí 1 giường King, 1 Sofa bed, phù hợp tối đa 3 khách. Các tiện ích đã gồm được liệt kê bên dưới.','1 giường King, 1 Sofa bed',38,1,'2026-11-11 21:13:08.601404',39),(11,'Tiêu chuẩn',3,1450000.00,4,'Căn hộ hai phòng ngủ diện tích 55 m² tại Đồi Bông Gòn - CN2: Triền Núi, bố trí 2 giường Queen, phù hợp tối đa 4 khách. Các tiện ích đã gồm được liệt kê bên dưới.','2 giường Queen',55,1,'2026-11-11 21:13:08.609128',40),(12,'Tiêu chuẩn',3,2500000.00,6,'Căn hộ Penthouse diện tích 85 m² tại Đồi Bông Gòn - CN2: Triền Núi, bố trí 3 giường King, phù hợp tối đa 6 khách. Các tiện ích đã gồm được liệt kê bên dưới.','3 giường King',85,1,'2026-11-11 21:13:08.617224',41),(25,'Studio Cozy (Hải Đăng) - biển',1,800000.00,2,'Studio diện tích 26 m² tại Đồi Bông Gòn - CN1: Hải Đăng, bố trí 1 giường King, phù hợp tối đa 2 khách. Đây là biến thể biển có giá và lịch trống riêng. Các tiện ích đã gồm được liệt kê bên dưới.','1 giường King',26,1,'2026-11-17 11:59:54.893814',30),(26,'Studio Cozy (Hải Đăng) - Có cửa sổ',1,770000.00,2,'Studio diện tích 26 m² tại Đồi Bông Gòn - CN1: Hải Đăng, bố trí 1 giường King, phù hợp tối đa 2 khách. Các tiện ích đã gồm được liệt kê bên dưới.','1 giường King',26,1,'2026-11-18 02:13:42.000000',30),(27,'Studio Cozy (Demo)',1,700111000.00,2,'Studio diện tích 26 m² tại Đồi Bông Gòn - CN1: Hải Đăng, bố trí 1 giường King, phù hợp tối đa 2 khách. Các tiện ích đã gồm được liệt kê bên dưới.','1 giường King',26,1,'2026-11-18 02:13:53.000000',30),(30,'Studio Cozy (Hải Đăng)',1,0.00,2,'Studio diện tích 26 m² tại Đồi Bông Gòn - CN1: Hải Đăng, bố trí 1 giường King, phù hợp tối đa 2 khách. Các tiện ích đã gồm được liệt kê bên dưới.','1 giường King',26,1,'2026-11-18 13:30:56.000000',NULL),(31,'1-Bedroom Deluxe (Hải Đăng)',1,950000.00,3,'Căn hộ một phòng ngủ diện tích 38 m² tại Đồi Bông Gòn - CN1: Hải Đăng, bố trí 1 giường King, 1 Sofa bed, phù hợp tối đa 3 khách. Các tiện ích đã gồm được liệt kê bên dưới.','1 giường King, 1 Sofa bed',38,1,'2026-11-18 13:30:56.000000',NULL),(32,'2-Bedroom Suite (Hải Đăng)',1,1450000.00,4,'Căn hộ hai phòng ngủ diện tích 55 m² tại Đồi Bông Gòn - CN1: Hải Đăng, bố trí 2 giường Queen, phù hợp tối đa 4 khách. Các tiện ích đã gồm được liệt kê bên dưới.','2 giường Queen',55,1,'2026-11-18 13:30:56.000000',NULL),(33,'Penthouse Panoramic (Hải Đăng)',1,5000.00,6,'Căn hộ Penthouse diện tích 85 m² tại Đồi Bông Gòn - CN1: Hải Đăng, bố trí 3 giường King, phù hợp tối đa 6 khách. Các tiện ích đã gồm được liệt kê bên dưới.','3 giường King',85,1,'2026-11-18 13:30:56.000000',NULL),(34,'Studio Cozy (Thiền Môn)',2,600000.00,2,'Studio diện tích 26 m² tại Đồi Bông Gòn - CN1: Thiền Môn, bố trí 1 giường King, phù hợp tối đa 2 khách. Các tiện ích đã gồm được liệt kê bên dưới.','1 giường King',26,1,'2026-11-18 13:30:56.000000',NULL),(35,'1-Bedroom Deluxe (Thiền Môn)',2,950000.00,3,'Căn hộ một phòng ngủ diện tích 38 m² tại Đồi Bông Gòn - CN1: Thiền Môn, bố trí 1 giường King, 1 Sofa bed, phù hợp tối đa 3 khách. Các tiện ích đã gồm được liệt kê bên dưới.','1 giường King, 1 Sofa bed',38,1,'2026-11-18 13:30:56.000000',NULL),(36,'2-Bedroom Suite (Thiền Môn)',2,1450000.00,4,'Căn hộ hai phòng ngủ diện tích 55 m² tại Đồi Bông Gòn - CN1: Thiền Môn, bố trí 2 giường Queen, phù hợp tối đa 4 khách. Các tiện ích đã gồm được liệt kê bên dưới.','2 giường Queen',55,1,'2026-11-18 13:30:56.000000',NULL),(37,'Penthouse Panoramic (Thiền Môn)',2,2500000.00,6,'Căn hộ Penthouse diện tích 85 m² tại Đồi Bông Gòn - CN1: Thiền Môn, bố trí 3 giường King, phù hợp tối đa 6 khách. Các tiện ích đã gồm được liệt kê bên dưới.','3 giường King',85,1,'2026-11-18 13:30:57.000000',NULL),(38,'Studio Cozy (Triền Núi)',3,600000.00,2,'Studio diện tích 26 m² tại Đồi Bông Gòn - CN2: Triền Núi, bố trí 1 giường King, phù hợp tối đa 2 khách. Các tiện ích đã gồm được liệt kê bên dưới.','1 giường King',26,1,'2026-11-18 13:30:57.000000',NULL),(39,'1-Bedroom Deluxe (Triền Núi)',3,950000.00,3,'Căn hộ một phòng ngủ diện tích 38 m² tại Đồi Bông Gòn - CN2: Triền Núi, bố trí 1 giường King, 1 Sofa bed, phù hợp tối đa 3 khách. Các tiện ích đã gồm được liệt kê bên dưới.','1 giường King, 1 Sofa bed',38,1,'2026-11-18 13:30:57.000000',NULL),(40,'2-Bedroom Suite (Triền Núi)',3,1450000.00,4,'Căn hộ hai phòng ngủ diện tích 55 m² tại Đồi Bông Gòn - CN2: Triền Núi, bố trí 2 giường Queen, phù hợp tối đa 4 khách. Các tiện ích đã gồm được liệt kê bên dưới.','2 giường Queen',55,1,'2026-11-18 13:30:57.000000',NULL),(41,'Penthouse Panoramic (Triền Núi)',3,2500000.00,6,'Căn hộ Penthouse diện tích 85 m² tại Đồi Bông Gòn - CN2: Triền Núi, bố trí 3 giường King, phù hợp tối đa 6 khách. Các tiện ích đã gồm được liệt kê bên dưới.','3 giường King',85,1,'2026-11-18 13:30:57.000000',NULL),(42,'Big Bang',2,0.00,7,'Phòng đặc biệt dành riêng cho Fan Big Bang','2 giường đôi, 1 giường đơn',28,1,'2026-11-18 14:21:31.000000',NULL),(43,'Tiêu chuẩn',2,1200000.00,7,'Phòng đặc biệt dành riêng cho Fan Big Bang','2 giường đôi, 1 giường đơn',28,1,'2026-11-18 14:23:21.000000',42);
/*!40000 ALTER TABLE `room_types` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `room_amenities`
--

LOCK TABLES `room_amenities` WRITE;
/*!40000 ALTER TABLE `room_amenities` DISABLE KEYS */;
INSERT INTO `room_amenities` VALUES (13,1,2,NULL),(14,1,3,NULL),(64,NULL,1,28),(65,NULL,4,28),(66,NULL,5,28),(67,NULL,6,28),(74,NULL,1,29),(75,NULL,4,29),(76,NULL,5,29),(77,NULL,6,29),(87,NULL,1,31),(88,NULL,4,31),(89,NULL,5,31),(90,NULL,6,31),(94,NULL,1,32),(95,NULL,4,32),(96,NULL,5,32),(97,NULL,6,32),(101,NULL,1,33),(102,NULL,4,33),(103,NULL,5,33),(104,NULL,6,33),(108,NULL,1,34),(109,NULL,4,34),(110,NULL,5,34),(111,NULL,6,34),(115,NULL,1,35),(116,NULL,4,35),(117,NULL,5,35),(118,NULL,6,35),(122,NULL,1,36),(123,NULL,4,36),(124,NULL,5,36),(125,NULL,6,36),(129,NULL,1,37),(130,NULL,4,37),(131,NULL,5,37),(132,NULL,6,37),(136,NULL,1,38),(137,NULL,4,38),(138,NULL,5,38),(139,NULL,6,38),(143,NULL,1,39),(144,NULL,4,39),(145,NULL,5,39),(146,NULL,6,39),(150,NULL,1,40),(151,NULL,4,40),(152,NULL,5,40),(153,NULL,6,40),(157,NULL,1,41),(158,NULL,4,41),(159,NULL,5,41),(160,NULL,6,41),(164,NULL,1,30),(165,NULL,2,30),(166,NULL,4,30),(167,NULL,5,30),(168,NULL,6,30),(169,NULL,7,30),(170,NULL,8,30),(171,NULL,3,30),(176,NULL,1,42),(177,NULL,5,42),(178,NULL,4,42),(179,NULL,9,42);
/*!40000 ALTER TABLE `room_amenities` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `room_images`
--

LOCK TABLES `room_images` WRITE;
/*!40000 ALTER TABLE `room_images` DISABLE KEYS */;
INSERT INTO `room_images` VALUES (15,NULL,31,'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=800&q=80','2026-11-18 13:30:56.000000'),(16,NULL,32,'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=800&q=80','2026-11-18 13:30:56.000000'),(17,NULL,33,'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=800&q=80','2026-11-18 13:30:56.000000'),(18,NULL,34,'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=800&q=80','2026-11-18 13:30:56.000000'),(19,NULL,35,'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=800&q=80','2026-11-18 13:30:56.000000'),(20,NULL,36,'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=800&q=80','2026-11-18 13:30:56.000000'),(21,NULL,37,'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=800&q=80','2026-11-18 13:30:57.000000'),(22,NULL,38,'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=800&q=80','2026-11-18 13:30:57.000000'),(23,NULL,39,'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=800&q=80','2026-11-18 13:30:57.000000'),(24,NULL,40,'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=800&q=80','2026-11-18 13:30:57.000000'),(25,NULL,41,'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=800&q=80','2026-11-18 13:30:57.000000'),(26,NULL,30,'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=800&q=80','2026-11-18 14:17:51.000000');
/*!40000 ALTER TABLE `room_images` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `services`
--

LOCK TABLES `services` WRITE;
/*!40000 ALTER TABLE `services` DISABLE KEYS */;
INSERT INTO `services` VALUES (1,'Ăn sáng','Bữa sáng tại homestay',80000.00,0,1),(2,'Đưa đón sân bay','Dịch vụ đưa đón theo yêu cầu',300000.00,0,1);
/*!40000 ALTER TABLE `services` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `stay_type_config`
--

LOCK TABLES `stay_type_config` WRITE;
/*!40000 ALTER TABLE `stay_type_config` DISABLE KEYS */;
INSERT INTO `stay_type_config` VALUES ('daytime','Trong ngày','07:00:00','17:00:00',0.70),('fullday','Qua ngày','14:00:00','12:00:00',1.00),('overnight','Qua đêm','19:00:00','12:00:00',0.70);
/*!40000 ALTER TABLE `stay_type_config` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `roles`
--

LOCK TABLES `roles` WRITE;
/*!40000 ALTER TABLE `roles` DISABLE KEYS */;
INSERT INTO `roles` VALUES (1,'admin'),(2,'manager');
/*!40000 ALTER TABLE `roles` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-11-18 15:13:59
