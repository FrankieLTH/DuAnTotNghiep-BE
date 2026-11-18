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
-- Table structure for table `ai_chat_logs`
--

DROP TABLE IF EXISTS `ai_chat_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ai_chat_logs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `customer_id` int DEFAULT NULL,
  `session_id` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `message` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `response` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `amenities`
--

DROP TABLE IF EXISTS `amenities`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `amenities` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `category` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `apartment`
--

DROP TABLE IF EXISTS `apartment`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `apartment` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `address` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `hotline` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('active','hidden') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `audit_logs`
--

DROP TABLE IF EXISTS `audit_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `audit_logs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `actor` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `actor_id` int DEFAULT NULL,
  `action` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `entity_type` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `entity_id` int NOT NULL,
  `old_value` longtext COLLATE utf8mb4_unicode_ci,
  `new_value` longtext COLLATE utf8mb4_unicode_ci,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `idx_audit_logs_entity` (`entity_type`,`entity_id`)
) ENGINE=InnoDB AUTO_INCREMENT=406 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `booking_guests`
--

DROP TABLE IF EXISTS `booking_guests`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `booking_guests` (
  `id` int NOT NULL AUTO_INCREMENT,
  `bookings_id` int NOT NULL,
  `guest_type` enum('primary','additional') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'primary',
  `is_staying` tinyint NOT NULL DEFAULT '1',
  `full_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `date_of_birth` date DEFAULT NULL,
  `gender` enum('male','female','other') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `phone` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `doc_type` enum('cccd','passport','birth_cert') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `doc_number` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `doc_image_front` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `doc_image_back` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ocr_confidence` decimal(5,2) DEFAULT NULL,
  `ocr_raw` longtext COLLATE utf8mb4_unicode_ci,
  `status` enum('empty','uploading','ocr_done','ocr_low_confidence','manual_child','confirmed') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'empty',
  `doc_deleted_at` datetime DEFAULT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `FK_e24fd34aaa0b68f5d5a7890a957` (`bookings_id`),
  CONSTRAINT `FK_e24fd34aaa0b68f5d5a7890a957` FOREIGN KEY (`bookings_id`) REFERENCES `bookings` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=198 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `booking_rooms`
--

DROP TABLE IF EXISTS `booking_rooms`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `booking_rooms` (
  `id` int NOT NULL AUTO_INCREMENT,
  `bookings_id` int NOT NULL,
  `room_types_id` int NOT NULL,
  `room_id` int DEFAULT NULL,
  `adults` int NOT NULL DEFAULT '1',
  `children` int NOT NULL DEFAULT '0',
  `unit_price` decimal(12,2) NOT NULL DEFAULT '0.00',
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `pricing_snapshot` json DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `FK_d5ac96fa3f50e31d2c30032c594` (`bookings_id`),
  KEY `FK_a71bd34a097c4ce9acc05ea17f7` (`room_types_id`),
  KEY `FK_cb71638bb7c1eeccc6753551bc6` (`room_id`),
  CONSTRAINT `FK_a71bd34a097c4ce9acc05ea17f7` FOREIGN KEY (`room_types_id`) REFERENCES `room_types` (`id`),
  CONSTRAINT `FK_cb71638bb7c1eeccc6753551bc6` FOREIGN KEY (`room_id`) REFERENCES `rooms` (`room_id`),
  CONSTRAINT `FK_d5ac96fa3f50e31d2c30032c594` FOREIGN KEY (`bookings_id`) REFERENCES `bookings` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=220 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `bookings`
--

DROP TABLE IF EXISTS `bookings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `bookings` (
  `id` int NOT NULL AUTO_INCREMENT,
  `booking_code` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `apartment_id` int NOT NULL,
  `customer_id` int DEFAULT NULL,
  `user_id` int DEFAULT NULL,
  `room_id` int DEFAULT NULL,
  `room_type_id` int DEFAULT NULL,
  `voucher_id` int DEFAULT NULL,
  `adults` int NOT NULL DEFAULT '1',
  `children` int NOT NULL DEFAULT '0',
  `guests_list` longtext COLLATE utf8mb4_unicode_ci,
  `is_booked_for_other` tinyint NOT NULL DEFAULT '0',
  `lock_email` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `booking_type` enum('overnight','daily','extended') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'overnight',
  `stay_type` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `booked_start_time` datetime NOT NULL,
  `start_at` datetime DEFAULT NULL,
  `booked_end_time` datetime NOT NULL,
  `end_at` datetime DEFAULT NULL,
  `check_in_actual` datetime DEFAULT NULL,
  `check_out_actual` datetime DEFAULT NULL,
  `booking_status` enum('draft','pending_payment','confirmed','checked_in','checked_out','expired','cancelled') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending_payment',
  `verification_status` enum('pending','passed','manual_review','rejected') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `reviewed_by` int DEFAULT NULL,
  `reviewed_at` datetime DEFAULT NULL,
  `consent_at` datetime DEFAULT NULL,
  `stay_reason` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `source` enum('online','admin') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'online',
  `created_by` int DEFAULT NULL,
  `note` text COLLATE utf8mb4_unicode_ci,
  `cancel_reason` text COLLATE utf8mb4_unicode_ci,
  `cancelled_at` datetime DEFAULT NULL,
  `cancelled_by` int DEFAULT NULL,
  `total_price` decimal(12,2) NOT NULL,
  `discount_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `hold_expires_at` datetime DEFAULT NULL,
  `is_archived` tinyint NOT NULL DEFAULT '0',
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `checkout_data` json DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `IDX_796e0227e4beff186bdd72ac53` (`booking_code`),
  KEY `idx_bookings_customer_hold` (`customer_id`,`hold_expires_at`),
  KEY `idx_bookings_apt_status_start` (`apartment_id`,`booking_status`,`booked_start_time`),
  KEY `FK_64cd97487c5c42806458ab5520c` (`user_id`),
  KEY `FK_0b0fc32fe6bd0119e281628df7a` (`room_id`),
  KEY `FK_40f3a4371f8958e374448103eac` (`room_type_id`),
  KEY `FK_431a3349d2347d05912374507cd` (`voucher_id`),
  KEY `FK_19523cb408949549d602c616791` (`reviewed_by`),
  KEY `FK_44342bfa812465df91df3d9a152` (`created_by`),
  KEY `FK_7bc8366af1bd0c09850cef683bd` (`cancelled_by`),
  CONSTRAINT `FK_0b0fc32fe6bd0119e281628df7a` FOREIGN KEY (`room_id`) REFERENCES `rooms` (`room_id`),
  CONSTRAINT `FK_19523cb408949549d602c616791` FOREIGN KEY (`reviewed_by`) REFERENCES `staff` (`staff_id`),
  CONSTRAINT `FK_26035b2877a922c0fa0dab2413f` FOREIGN KEY (`apartment_id`) REFERENCES `apartment` (`id`),
  CONSTRAINT `FK_40f3a4371f8958e374448103eac` FOREIGN KEY (`room_type_id`) REFERENCES `room_types` (`id`),
  CONSTRAINT `FK_431a3349d2347d05912374507cd` FOREIGN KEY (`voucher_id`) REFERENCES `vouchers` (`id`),
  CONSTRAINT `FK_44342bfa812465df91df3d9a152` FOREIGN KEY (`created_by`) REFERENCES `staff` (`staff_id`),
  CONSTRAINT `FK_64cd97487c5c42806458ab5520c` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`),
  CONSTRAINT `FK_7bc8366af1bd0c09850cef683bd` FOREIGN KEY (`cancelled_by`) REFERENCES `staff` (`staff_id`),
  CONSTRAINT `FK_8e21b7ae33e7b0673270de4146f` FOREIGN KEY (`customer_id`) REFERENCES `customer` (`customer_id`)
) ENGINE=InnoDB AUTO_INCREMENT=225 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `customer`
--

DROP TABLE IF EXISTS `customer`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `customer` (
  `customer_id` int NOT NULL AUTO_INCREMENT,
  `full_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `phone` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_blocked` tinyint NOT NULL DEFAULT '0',
  `is_hidden` tinyint NOT NULL DEFAULT '0',
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `password_hash` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `account_created_at` datetime DEFAULT NULL,
  `email_verified_at` datetime DEFAULT NULL,
  `wallet_balance` decimal(12,2) NOT NULL DEFAULT '0.00',
  `wallet_reserved` decimal(12,2) NOT NULL DEFAULT '0.00',
  PRIMARY KEY (`customer_id`),
  UNIQUE KEY `IDX_fdb2f3ad8115da4c7718109a6e` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=116 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `lock`
--

DROP TABLE IF EXISTS `lock`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `lock` (
  `id` int NOT NULL AUTO_INCREMENT,
  `room_id` int DEFAULT NULL,
  `cloud_lock_id` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `lock_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `lock_type` enum('ttlock','manual','other') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'ttlock',
  `lock_status` enum('online','offline','unknown') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'unknown',
  `battery_level` int NOT NULL DEFAULT '100',
  `master_pin` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `last_sync_at` datetime DEFAULT NULL,
  `deleted_at` datetime(6) DEFAULT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `FK_8e1aedbd9de77562e3cb0731b29` (`room_id`),
  CONSTRAINT `FK_8e1aedbd9de77562e3cb0731b29` FOREIGN KEY (`room_id`) REFERENCES `rooms` (`room_id`)
) ENGINE=InnoDB AUTO_INCREMENT=37 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `lock_pin`
--

DROP TABLE IF EXISTS `lock_pin`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `lock_pin` (
  `id` int NOT NULL AUTO_INCREMENT,
  `booking_id` int NOT NULL,
  `lock_id` int NOT NULL,
  `cloud_pw_id` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `pin` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `lock_pin_start_time` datetime DEFAULT NULL,
  `lock_pin_end_time` datetime DEFAULT NULL,
  `status` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `FK_08dcaa46ea2b53fa060105ca963` (`booking_id`),
  KEY `FK_091fca996ada6e39c9b68ea3003` (`lock_id`),
  CONSTRAINT `FK_08dcaa46ea2b53fa060105ca963` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`id`) ON DELETE CASCADE,
  CONSTRAINT `FK_091fca996ada6e39c9b68ea3003` FOREIGN KEY (`lock_id`) REFERENCES `lock` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `payment_methods`
--

DROP TABLE IF EXISTS `payment_methods`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `payment_methods` (
  `id` int NOT NULL AUTO_INCREMENT,
  `method_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `provider_code` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_active` tinyint NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `payments`
--

DROP TABLE IF EXISTS `payments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `payments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `booking_id` int NOT NULL,
  `payment_method_id` int NOT NULL,
  `transaction_id` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `amount` decimal(12,2) NOT NULL,
  `payment_status` enum('pending','paid','failed','refunded','partially_refunded') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `paid_at` datetime DEFAULT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `provider_data` json DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `FK_e86edf76dc2424f123b9023a2b2` (`booking_id`),
  KEY `FK_12fd861c33c885f01b9a7da7d93` (`payment_method_id`),
  CONSTRAINT `FK_12fd861c33c885f01b9a7da7d93` FOREIGN KEY (`payment_method_id`) REFERENCES `payment_methods` (`id`),
  CONSTRAINT `FK_e86edf76dc2424f123b9023a2b2` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=161 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `refunds`
--

DROP TABLE IF EXISTS `refunds`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `refunds` (
  `id` int NOT NULL AUTO_INCREMENT,
  `payment_id` int DEFAULT NULL,
  `booking_id` int NOT NULL,
  `refund_amount` decimal(12,2) NOT NULL,
  `refund_percentage` decimal(5,2) DEFAULT NULL,
  `status` enum('requested','approved','rejected','processed') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'requested',
  `reason` text COLLATE utf8mb4_unicode_ci,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=30 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `roles`
--

DROP TABLE IF EXISTS `roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `roles` (
  `role_id` int NOT NULL AUTO_INCREMENT,
  `role_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`role_id`),
  UNIQUE KEY `IDX_ac35f51a0f17e3e1fe12112603` (`role_name`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `room_amenities`
--

DROP TABLE IF EXISTS `room_amenities`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `room_amenities` (
  `id` int NOT NULL AUTO_INCREMENT,
  `room_id` int DEFAULT NULL,
  `amenity_id` int NOT NULL,
  `room_types_id` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `IDX_1bbdd33b01f2e52f4dd5074354` (`room_id`),
  KEY `IDX_936612d991e2522e82cd86fa10` (`amenity_id`),
  CONSTRAINT `FK_1bbdd33b01f2e52f4dd50743544` FOREIGN KEY (`room_id`) REFERENCES `rooms` (`room_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `FK_936612d991e2522e82cd86fa106` FOREIGN KEY (`amenity_id`) REFERENCES `amenities` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=180 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `room_images`
--

DROP TABLE IF EXISTS `room_images`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `room_images` (
  `id` int NOT NULL AUTO_INCREMENT,
  `room_id` int DEFAULT NULL,
  `room_types_id` int DEFAULT NULL,
  `image_url` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `FK_5f4e74488214bfa1d5b6556ddd6` (`room_id`),
  CONSTRAINT `FK_5f4e74488214bfa1d5b6556ddd6` FOREIGN KEY (`room_id`) REFERENCES `rooms` (`room_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=27 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `room_types`
--

DROP TABLE IF EXISTS `room_types`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `room_types` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `apartment_id` int NOT NULL,
  `base_price` decimal(12,2) NOT NULL,
  `max_occupancy` int NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `bed_config` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '1 giường đôi',
  `area` int NOT NULL DEFAULT '28',
  `is_active` tinyint NOT NULL DEFAULT '1',
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `parent_id` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `FK_8056ea06eca78a5140091b4f2d7` (`apartment_id`),
  CONSTRAINT `FK_8056ea06eca78a5140091b4f2d7` FOREIGN KEY (`apartment_id`) REFERENCES `apartment` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=44 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `rooms`
--

DROP TABLE IF EXISTS `rooms`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `rooms` (
  `room_id` int NOT NULL AUTO_INCREMENT,
  `apartment_id` int NOT NULL,
  `room_type_id` int NOT NULL,
  `room_number` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('available','occupied','cleaning','maintenance') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'available',
  `special_features` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Mô tả đặc điểm đặc biệt của phòng (nhập tay, không ảnh hưởng giá)',
  `last_maintenance_date` date DEFAULT NULL,
  `is_hidden` tinyint NOT NULL DEFAULT '0',
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `floor` int NOT NULL DEFAULT '0',
  `room_group_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `note` text COLLATE utf8mb4_unicode_ci,
  `housekeeping` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'clean',
  `deleted_at` datetime DEFAULT NULL,
  `feature_ids` json DEFAULT NULL,
  `blocked_periods` json DEFAULT NULL,
  PRIMARY KEY (`room_id`),
  UNIQUE KEY `IDX_1f52dc8c93ef02fc3d9f9080a9` (`apartment_id`,`room_number`),
  KEY `FK_8a380bdc519b8701daf0ec62da0` (`room_type_id`),
  CONSTRAINT `FK_8a380bdc519b8701daf0ec62da0` FOREIGN KEY (`room_type_id`) REFERENCES `room_types` (`id`),
  CONSTRAINT `FK_d56932efcb93d5619c6fe61e843` FOREIGN KEY (`apartment_id`) REFERENCES `apartment` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=93 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `services`
--

DROP TABLE IF EXISTS `services`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `services` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `price` decimal(12,2) NOT NULL,
  `is_compensation` tinyint NOT NULL DEFAULT '0',
  `is_active` tinyint NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `staff`
--

DROP TABLE IF EXISTS `staff`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `staff` (
  `staff_id` int NOT NULL AUTO_INCREMENT,
  `role_id` int NOT NULL,
  `apartment_id` int DEFAULT NULL,
  `full_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `phone` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `password_hash` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_blocked` tinyint NOT NULL DEFAULT '0',
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`staff_id`),
  UNIQUE KEY `IDX_902985a964245652d5e3a0f5f6` (`email`),
  KEY `FK_c3fe01125c99573751fe5e55666` (`role_id`),
  KEY `FK_42a251608a9c56c534d7daa6a61` (`apartment_id`),
  CONSTRAINT `FK_42a251608a9c56c534d7daa6a61` FOREIGN KEY (`apartment_id`) REFERENCES `apartment` (`id`),
  CONSTRAINT `FK_c3fe01125c99573751fe5e55666` FOREIGN KEY (`role_id`) REFERENCES `roles` (`role_id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `stay_type_config`
--

DROP TABLE IF EXISTS `stay_type_config`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `stay_type_config` (
  `stay_type` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `start_time` time NOT NULL,
  `end_time` time NOT NULL,
  `price_factor` decimal(3,2) NOT NULL,
  PRIMARY KEY (`stay_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `transaction`
--

DROP TABLE IF EXISTS `transaction`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `transaction` (
  `id` int NOT NULL AUTO_INCREMENT,
  `booking_id` int NOT NULL,
  `type` enum('payment','refund') COLLATE utf8mb4_unicode_ci NOT NULL,
  `amount` decimal(12,2) NOT NULL,
  `payment_method` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'counter_cash',
  `transaction_code` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `note` text COLLATE utf8mb4_unicode_ci,
  `created_by` int DEFAULT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `FK_d52119b6a9344bfec6734475fa7` (`booking_id`),
  KEY `FK_25b1234bd0af272d259fe5e38de` (`created_by`),
  CONSTRAINT `FK_25b1234bd0af272d259fe5e38de` FOREIGN KEY (`created_by`) REFERENCES `staff` (`staff_id`),
  CONSTRAINT `FK_d52119b6a9344bfec6734475fa7` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=119 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `role_id` int NOT NULL DEFAULT '1',
  `full_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `phone` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `password_hash` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('active','blocked') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `IDX_97672ac88f789774dd47f7c8be` (`email`),
  KEY `FK_a2cecd1a3531c0b041e29ba46e1` (`role_id`),
  CONSTRAINT `FK_a2cecd1a3531c0b041e29ba46e1` FOREIGN KEY (`role_id`) REFERENCES `roles` (`role_id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `vouchers`
--

DROP TABLE IF EXISTS `vouchers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `vouchers` (
  `id` int NOT NULL AUTO_INCREMENT,
  `code` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `discount_type` enum('percentage','fixed_amount') COLLATE utf8mb4_unicode_ci NOT NULL,
  `discount_value` decimal(12,2) NOT NULL,
  `max_discount_amount` decimal(12,2) DEFAULT NULL,
  `min_order_value` decimal(12,2) DEFAULT NULL,
  `usage_limit` int DEFAULT NULL,
  `used_count` int NOT NULL DEFAULT '0',
  `start_date` datetime DEFAULT NULL,
  `end_date` datetime DEFAULT NULL,
  `is_active` tinyint NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `IDX_efc30b2b9169e05e0e1e19d6dd` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping events for database 'duanmoi'
--

--
-- Dumping routines for database 'duanmoi'
--
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-11-18 15:13:59
