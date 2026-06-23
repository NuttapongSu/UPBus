-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Jun 16, 2026 at 09:35 AM
-- Server version: 8.0.34
-- PHP Version: 8.1.22

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `db_bustransit`
--

-- --------------------------------------------------------

--
-- Table structure for table `admins`
--

CREATE TABLE `admins` (
  `id` int NOT NULL,
  `username` varchar(50) COLLATE utf8mb3_unicode_ci NOT NULL,
  `password` varchar(255) COLLATE utf8mb3_unicode_ci NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_unicode_ci;

--
-- Dumping data for table `admins`
--

INSERT INTO `admins` (`id`, `username`, `password`, `created_at`) VALUES
(1, 'admin', '1234', '2025-12-24 11:57:15'),
(2, 'admin2', '123456', '2025-12-24 11:57:15'),
(3, 'admin3', '123456', '2025-12-24 11:57:15');

-- --------------------------------------------------------

--
-- Table structure for table `buses`
--

CREATE TABLE `buses` (
  `id` int NOT NULL,
  `bus_number` varchar(20) COLLATE utf8mb3_unicode_ci NOT NULL,
  `current_driver_id` int DEFAULT NULL,
  `current_route` varchar(50) COLLATE utf8mb3_unicode_ci DEFAULT NULL,
  `status_color` varchar(20) COLLATE utf8mb3_unicode_ci DEFAULT 'Purple' COMMENT '''Default=Purple, Options: Green, Red, Blue, Yellow, White''',
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_unicode_ci;

--
-- Dumping data for table `buses`
--

INSERT INTO `buses` (`id`, `bus_number`, `current_driver_id`, `current_route`, `status_color`, `updated_at`) VALUES
(1, '1', NULL, NULL, 'Purple', '2026-02-11 23:59:03'),
(2, '2', 45, NULL, 'Green', '2026-06-07 12:56:37'),
(3, '3', 19, NULL, 'Red', '2026-03-12 00:10:19'),
(4, '4', 25, NULL, 'Green', '2026-02-11 04:19:43'),
(5, '5', 47, NULL, 'Green', '2026-06-12 01:55:37'),
(6, '6', 24, NULL, 'Green', '2026-04-02 02:30:09'),
(7, '7', 12, NULL, 'Green', '2026-01-13 09:37:20'),
(8, '8', 14, NULL, 'Green', '2025-12-21 23:03:06'),
(9, '9', 13, NULL, 'Green', '2026-06-14 15:33:10'),
(10, '10', 22, NULL, 'Green', '2026-01-06 02:06:14'),
(11, '11', 42, NULL, 'Green', '2026-01-19 07:17:28'),
(12, '12', 16, NULL, 'Green', '2026-02-20 23:24:45'),
(13, '13', 34, NULL, 'Green', '2026-01-12 00:51:38'),
(14, '14', 21, NULL, 'Green', '2026-03-01 23:49:37'),
(15, '15', 29, NULL, 'Green', '2026-03-18 04:05:51'),
(16, '16', NULL, NULL, 'Purple', '2026-01-12 13:53:18'),
(17, '17', 28, NULL, 'Blue', '2026-01-19 05:16:44'),
(18, '18', 11, NULL, 'Green', '2026-03-19 02:59:10'),
(19, '19', 33, NULL, 'Green', '2026-03-06 04:07:30'),
(20, '20', 15, NULL, 'Red', '2026-03-02 01:56:59'),
(21, '21', 18, NULL, 'Green', '2025-12-19 13:07:38'),
(22, '22', 10, NULL, 'Green', '2025-12-22 08:25:46'),
(23, '23', 37, NULL, 'Green', '2025-12-22 11:56:31'),
(24, '24', NULL, NULL, 'Purple', '2026-06-14 05:59:00'),
(25, '25', 35, NULL, 'Green', '2026-01-19 07:50:03'),
(26, '26', 41, NULL, 'Green', '2026-02-02 00:49:11'),
(27, '27', 17, NULL, 'Red', '2026-01-26 05:19:35'),
(28, '28', 30, NULL, 'Blue', '2026-02-23 00:17:14'),
(29, '29', 38, NULL, 'Green', '2026-01-13 11:24:43'),
(30, '30', NULL, NULL, 'Purple', '2026-02-12 12:51:37');

-- --------------------------------------------------------

--
-- Table structure for table `complaints`
--

CREATE TABLE `complaints` (
  `id` int NOT NULL,
  `topic` varchar(255) COLLATE utf8mb3_unicode_ci NOT NULL,
  `bus_number` int NOT NULL,
  `detail` text COLLATE utf8mb3_unicode_ci NOT NULL,
  `image_file` varchar(255) COLLATE utf8mb3_unicode_ci DEFAULT NULL,
  `status` enum('pending','in_progress','resolved') COLLATE utf8mb3_unicode_ci DEFAULT 'pending',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_unicode_ci;

--
-- Dumping data for table `complaints`
--

INSERT INTO `complaints` (`id`, `topic`, `bus_number`, `detail`, `image_file`, `status`, `created_at`) VALUES
(1, 'driver-service', 1, 'test', 'evidence-1766482662540-657138873.jpg', 'resolved', '2025-12-23 09:37:42'),
(2, 'driver-service', 2, 'testt', 'evidence-1766482731399-146020102.jpg', 'resolved', '2025-12-23 09:38:51'),
(3, 'bus-condition', 3, 'testtt', 'evidence-1766557333832-955511989.jpg', 'in_progress', '2025-12-24 06:22:13'),
(4, 'system-wrong', 4, 'testtt', 'evidence-1766557364495-680076271.jpg', 'pending', '2025-12-24 06:22:44'),
(5, 'driver-service', 5, 'testststs', 'evidence-1766560338035-105218008.jpg', 'pending', '2025-12-24 07:12:18'),
(6, 'bus-condition', 6, 'test tsetstte', 'evidence-1766565291552-880358529.jpg', 'pending', '2025-12-24 08:34:51'),
(7, 'driver-service', 1, 'test1', 'evidence-1766569264135-634473177.jpg', 'pending', '2025-12-24 09:41:04'),
(8, 'driver-service', 1, 'test2', 'evidence-1766569273867-591974914.jpg', 'pending', '2025-12-24 09:41:13'),
(9, 'driver-service', 1, 'test3', 'evidence-1766569283350-152373800.jpg', 'pending', '2025-12-24 09:41:23'),
(10, 'driver-service', 1, 'test10', 'evidence-1766569291662-409275752.jpg', 'pending', '2025-12-24 09:41:31'),
(11, 'driver-service', 1, 'test11', 'evidence-1766569299347-6185210.jpg', 'pending', '2025-12-24 09:41:39'),
(12, 'driver-service', 2, 'dd', 'evidence-1766588492394-947721103.jpg', 'pending', '2025-12-24 15:01:32'),
(13, 'bus-condition', 11, '222', 'evidence-1766588849775-245174239.jpg', 'pending', '2025-12-24 15:07:29'),
(14, 'driver-service', 5555555, '55555555', NULL, 'pending', '2025-12-24 15:08:04'),
(15, 'system-wrong', 21, '666666666666666666666', NULL, 'in_progress', '2025-12-24 15:23:41'),
(16, 'driver-service', 6, 'น่ากัววววววววววววว\r\n', 'evidence-1766589849620-532512313.jpg', 'resolved', '2025-12-24 15:24:09'),
(17, 'system-wrong', 28, 'รถวิ่งไม่ค่อยตรงสาย หรือสีตัวเอง', NULL, 'pending', '2026-01-06 03:45:30'),
(18, 'driver-service', 1, '1', 'evidence-1769284919616-658513025.jpg', 'pending', '2026-01-24 20:01:59'),
(19, 'system-wrong', 17, 'สายรถที่ปรากฏบนแอพเป็นสาย 3 แต่ที่ระบุบนป้ายไฟรถเป็นสาย 2 ครับ', NULL, 'pending', '2026-02-23 12:15:07'),
(20, 'system-wrong', 27, 'ในเว็บไซต์ขึ้นเป็นรถสาย 2 แต่ในป้ายไฟที่ติดบนรถเป็นสาย 1', NULL, 'pending', '2026-02-25 03:25:03'),
(21, 'driver-service', 7, 'ขับรถกระชากมากขับไม่ดีด่วยค่ะ เหยียบเบรคตลอดทางกระชากไปกระชากมา เมารถเลย ปกติคันอื่นก็เป็นนะคะ แต่ไม่ถึงกับขนาดนี้ รบกวนแก้ไขด้วยค่ะ\r\n', NULL, 'pending', '2026-03-04 12:17:57'),
(22, 'system-wrong', 13, 'รถสายประตู 3 ทำไมขึ้นเป็นสายหน้ามอ แจ้งเตือนระบบ', NULL, 'pending', '2026-03-08 06:07:38'),
(23, 'driver-service', 27, 'เล่นโทรศัพท์ รอ10นาทีแล้วยังไม่ออก จนจะ20นาทีแล้วค่อยออก', NULL, 'pending', '2026-03-17 01:50:00'),
(24, 'system-wrong', 19, 'รถสาย19มีในแมปแต่มาถึงไม่มีรถอยู่ที่นั้นเลยยประตู2', NULL, 'pending', '2026-04-30 14:11:27'),
(25, 'system-wrong', 1, 'อยากให้รถเมย์ที่ว่างวนขึ้นไปรับบ้างค่ะไม่ใช่รอเต็มแล้วขึ้นๆปมันมัยเยอะมาก ภ้ามันเต็มอยู่แล้วจะเอาที่ไหนขึ้นไปอีกยังไงช่วยปรับปรุงหน่อยนะคะ เรื่องการเดินรถที่มากขึ้นและรถคันที่ว่างให้ขึ้นไปรับบ้าง รอมาหลายคันบางทีทุกสายจนมันเต็มหมดตั้งแต่สายแรกก้ไม่มีที่ให้ไปแล้วค่ะ', NULL, 'pending', '2026-06-07 01:21:40'),
(26, 'driver-service', 12, 'จุดจอดรถเมล์หน้าป้ายคณะทันตะ ตรงBus stop พนักงานรถเมล์ไม่จอด และทำกิริยา ให้เดินไปตรงจุดยืนหน้าป้าย หลังอเมซอน โดยไม่จอดป้าย bus stop', NULL, 'pending', '2026-06-14 07:04:50'),
(27, 'system-wrong', 1, 'ระบบรถทุกคันใช้ไม่ค่อยได้มั่วไปหมดรถเต็มทุกคัน', NULL, 'pending', '2026-06-15 10:45:21');

-- --------------------------------------------------------

--
-- Table structure for table `drivers`
--

CREATE TABLE `drivers` (
  `id` int NOT NULL,
  `line_user_id` varchar(255) COLLATE utf8mb3_unicode_ci NOT NULL,
  `full_name` varchar(100) COLLATE utf8mb3_unicode_ci NOT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_unicode_ci;

--
-- Dumping data for table `drivers`
--

INSERT INTO `drivers` (`id`, `line_user_id`, `full_name`, `is_active`, `created_at`) VALUES
(1, 'U_TEST_550', 'นายทดสอบ ดีเพี้ยง', 1, '2025-12-03 09:23:12'),
(3, 'U_TEST_5290', 'จ๊อบแจ๊บ อุอิ', 1, '2025-12-04 06:01:48'),
(4, 'Uf4b18765f53d75f3a3ead565510596c9', 'นายเทสดี ระบบปังๆ', 1, '2025-12-16 10:34:21'),
(5, 'U4a3834686de0948cf645e9474a929abe', 'Ducky', 1, '2025-12-17 02:41:18'),
(6, 'U56027b85376301ef13ecf236e5eef7e7', 'สุทธิศักดิ์ ยารังษี', 1, '2025-12-19 07:11:21'),
(7, 'Ue28218de3961f3ae77092056748f4264', 'สำเริง  เผ่าคำ', 1, '2025-12-19 07:11:56'),
(8, 'U6caba177987f23369e28643c2bbc86cb', 'ถนัดกิจ เผ่าต๊ะใจ', 1, '2025-12-19 08:05:13'),
(9, 'U584a04d297a1744128168a89c7a15adb', 'วรวุฒิ วงศ์บุญชุม', 1, '2025-12-19 12:24:51'),
(10, 'U8ae61b97d9ef0823c29d675bda92ecdb', 'สายัณห์ มาแดง', 1, '2025-12-19 12:29:54'),
(11, 'U038d7729dc91e0da61c12a37bbafb5d1', 'จิรศักดิ์ ชุ่มวงค์', 1, '2025-12-19 12:39:05'),
(12, 'Uda90510cef9df40de8f58ac7b8021cf9', 'สันต์.เทพา', 1, '2025-12-19 12:45:35'),
(13, 'U18b60670585ac9c675c1fe39933cc688', 'นพดล อินเถิง', 1, '2025-12-19 12:49:30'),
(14, 'Uaa58b63ab5219cbc38107fa0e8bd25be', 'ธนะพัฒน์ ลิมปิพงศ์ธนิต', 1, '2025-12-19 12:50:45'),
(15, 'U9767f93e83a20abbead27f4a8aef6cd7', 'สมศ้กดิ์ วันจันทร์', 1, '2025-12-19 12:53:20'),
(16, 'U704b8f505c43e5668a05c7a9bb7cbf59', 'วรธน เภตรา', 1, '2025-12-19 12:56:57'),
(17, 'U85519e21001107bab8b2602e20565783', 'ปริญญา ปินใจ', 1, '2025-12-19 12:58:36'),
(18, 'Uf9dea73768f94488c11eaad06ac062f8', 'บุญเรียน ทัดมาลา', 1, '2025-12-19 13:06:08'),
(19, 'U38b7f9a954eb134a96941fdee327b756', 'ส่น ศรีวิชัย', 1, '2025-12-19 13:06:18'),
(20, 'Uba9a478a568f47192584f97b9644e285', 'ธีระวัฒน์ ไชยทอง', 1, '2025-12-19 13:10:04'),
(21, 'Uea40b20224f0748da6999efc6686044f', 'ศุภโชค ใจภักดี', 1, '2025-12-19 13:16:36'),
(22, 'U35062496cd02437620ecc4cea80c33f9', 'กำพล ลำพูน', 1, '2025-12-19 13:27:34'),
(23, 'Ub0739d4ed33a234b3428ca45e7c56a7c', 'บุญส่ง ครองชัย', 1, '2025-12-19 13:29:37'),
(24, 'Ub38a03dd069a47edeb22fead46d80556', 'วัชระ สวายสี', 1, '2025-12-19 23:30:16'),
(25, 'Uabfe9acd21d14c5b1d3035e318e01622', 'คมสันต์', 1, '2025-12-21 00:14:39'),
(26, 'Ud7a87727fd04c3531f7ff2f18d2f5dfc', 'จิระวัฒน์ อินต๊ะสาร', 1, '2025-12-22 01:36:53'),
(27, 'U823b7f8fbf5db4f2982e8dee85c6dbfe', 'วิโรจน์ นามวงศ์', 1, '2025-12-22 02:11:37'),
(28, 'Ucca60475f913f936746ab85a1cee33d4', 'เมธา สีมานอก', 1, '2025-12-22 02:40:19'),
(29, 'Ucd9758fb286b96d0afc27c5d4811574a', 'ชุติพนธ์ พรมมา', 1, '2025-12-22 02:51:51'),
(30, 'U87bd609afe3770bb7bc41b28faad553d', 'ธวัชชัย เทพสูธรรม', 1, '2025-12-22 03:59:37'),
(31, 'U69025cd0ce8a56ed6b53868d3327ff48', 'กฤตภาส สุทธิแสน', 1, '2025-12-22 04:50:26'),
(32, 'Ubc55ab7ff9b6c26355dc7675750b3ff0', 'ระวิวัฒน์ องอาจ', 1, '2025-12-22 06:04:32'),
(33, 'U5d93f5bed390f542bdd2bb6ba860c5b8', 'เดี๋ยว อนุภาพ', 1, '2025-12-22 06:59:31'),
(34, 'Ucc26a4811194b67de5edc17bea53cdd4', 'บัญชา ฟักแด้ว', 1, '2025-12-22 08:14:51'),
(35, 'Ub3169cac66da750bfb2ed7be989c4279', 'ไกรสร ใจเสมอ', 1, '2025-12-22 08:35:16'),
(36, 'Ub2996f0db99573fcbeba40dab8e052ea', 'ศิวะ เอี่ยมสกุลวิวัฒน์', 1, '2025-12-22 11:20:28'),
(37, 'U483094d6c299a9b5676f6fdb5a8ae777', 'สุธิพร เฮงพีนธ์', 1, '2025-12-22 11:41:29'),
(38, 'U67833c4df160aa5c0f93cc607651a9a4', 'ไกริวชญ์   วงคนปัญญา', 1, '2025-12-22 12:02:11'),
(39, 'U0001d11f3ece69cbf862f1ba0beff9d3', 'สายัณต์ ทาทอง', 1, '2025-12-23 11:28:17'),
(40, 'U308b71d58b27b6a42c89b350075133b3', 'admin', 1, '2025-12-25 06:40:37'),
(41, 'U46aa09646d3266e92b78ff34a0027e2d', 'สายันต์   ทาทอง', 1, '2025-12-27 09:02:02'),
(42, 'U8e9c1cb562243c21fe2382c908fcf8eb', 'นิเวช', 1, '2025-12-28 08:41:39'),
(43, 'U623b3cfdfb7b7e626033eab9fbdef563', 'Boom', 1, '2026-01-20 06:40:18'),
(44, 'U86a2d2090f63a1bbad08fd6da52dd219', 'กลุ่มรถบัสครับ', 1, '2026-01-30 07:27:34'),
(45, 'U57a11c4526b88c70ffbc562b447410a7', 'ศิริศักดิ์ เงินเย็น', 1, '2026-06-07 02:41:21'),
(46, 'U01b90e269cf6c339c4b2a74bc37d63d2', 'นายอนุสรณ์ วิเศษสิงห์', 1, '2026-06-11 23:39:30'),
(47, 'Ub2637d5d7e2ae82cb8e6d25116ff00ae', 'นายรัญ เผ่ากันทะ', 1, '2026-06-12 01:53:22');

-- --------------------------------------------------------

--
-- Table structure for table `evaluations_app`
--

CREATE TABLE `evaluations_app` (
  `id` int NOT NULL,
  `service_score` int NOT NULL,
  `status_score` int NOT NULL,
  `efficiency_score` int NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_unicode_ci;

--
-- Dumping data for table `evaluations_app`
--

INSERT INTO `evaluations_app` (`id`, `service_score`, `status_score`, `efficiency_score`, `created_at`) VALUES
(1, 5, 5, 5, '2025-12-24 06:50:08'),
(2, 5, 5, 5, '2025-12-24 06:58:07'),
(3, 5, 5, 5, '2025-12-24 07:10:44'),
(4, 5, 5, 5, '2025-12-24 11:33:45'),
(5, 5, 5, 5, '2025-12-24 11:35:06'),
(6, 5, 5, 5, '2025-12-24 11:35:22'),
(7, 5, 5, 5, '2025-12-24 11:35:29'),
(8, 5, 5, 5, '2025-12-24 11:35:36'),
(9, 5, 5, 5, '2025-12-24 11:35:51'),
(10, 5, 5, 5, '2025-12-24 11:35:58'),
(11, 5, 5, 5, '2025-12-24 11:36:05'),
(12, 5, 5, 5, '2025-12-24 11:36:13'),
(13, 5, 5, 5, '2025-12-24 15:07:35'),
(14, 5, 5, 5, '2025-12-24 15:24:26'),
(15, 5, 5, 5, '2026-02-10 10:58:46'),
(16, 1, 1, 1, '2026-02-24 10:40:37'),
(17, 3, 1, 2, '2026-02-25 08:23:43'),
(18, 5, 5, 5, '2026-02-26 06:29:21'),
(19, 1, 1, 1, '2026-02-26 18:41:21'),
(20, 2, 5, 4, '2026-04-01 08:57:26'),
(21, 4, 3, 2, '2026-05-02 11:12:49'),
(22, 4, 3, 4, '2026-05-05 23:42:25'),
(23, 4, 3, 4, '2026-05-18 07:22:00'),
(24, 2, 1, 1, '2026-06-10 10:02:42');

-- --------------------------------------------------------

--
-- Table structure for table `evaluations_travel`
--

CREATE TABLE `evaluations_travel` (
  `id` int NOT NULL,
  `comfort_score` int NOT NULL,
  `time_score` int NOT NULL,
  `safety_score` int NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_unicode_ci;

--
-- Dumping data for table `evaluations_travel`
--

INSERT INTO `evaluations_travel` (`id`, `comfort_score`, `time_score`, `safety_score`, `created_at`) VALUES
(1, 5, 5, 5, '2025-12-24 06:50:21'),
(2, 5, 5, 5, '2025-12-24 06:58:14'),
(3, 5, 5, 5, '2025-12-24 07:10:49'),
(4, 4, 4, 4, '2025-12-24 10:11:01'),
(5, 4, 4, 4, '2025-12-24 10:11:25'),
(6, 3, 3, 3, '2025-12-24 10:59:18'),
(7, 5, 5, 5, '2025-12-24 11:33:53'),
(8, 5, 5, 5, '2025-12-24 11:34:09'),
(9, 5, 5, 5, '2025-12-24 11:34:20'),
(10, 5, 5, 5, '2025-12-24 11:34:29'),
(11, 5, 5, 5, '2025-12-24 11:34:45'),
(12, 5, 5, 5, '2025-12-24 15:16:10'),
(13, 4, 4, 4, '2025-12-24 15:24:35'),
(14, 5, 1, 5, '2026-02-11 07:31:02'),
(15, 4, 1, 4, '2026-02-23 05:41:09'),
(16, 3, 2, 1, '2026-02-25 08:23:31'),
(17, 3, 1, 1, '2026-02-26 06:29:08'),
(18, 5, 1, 4, '2026-02-27 04:06:30'),
(19, 1, 1, 1, '2026-06-08 14:07:34');

-- --------------------------------------------------------

--
-- Table structure for table `transaction_logs`
--

CREATE TABLE `transaction_logs` (
  `id` int NOT NULL,
  `driver_id` int NOT NULL,
  `bus_id` int NOT NULL,
  `action_type` varchar(50) COLLATE utf8mb3_unicode_ci DEFAULT NULL,
  `log_time` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_unicode_ci;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `admins`
--
ALTER TABLE `admins`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `buses`
--
ALTER TABLE `buses`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `bus_number` (`bus_number`),
  ADD KEY `current_driver_id` (`current_driver_id`);

--
-- Indexes for table `complaints`
--
ALTER TABLE `complaints`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `drivers`
--
ALTER TABLE `drivers`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `line_user_id` (`line_user_id`);

--
-- Indexes for table `evaluations_app`
--
ALTER TABLE `evaluations_app`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `evaluations_travel`
--
ALTER TABLE `evaluations_travel`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `transaction_logs`
--
ALTER TABLE `transaction_logs`
  ADD PRIMARY KEY (`id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `admins`
--
ALTER TABLE `admins`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `buses`
--
ALTER TABLE `buses`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=31;

--
-- AUTO_INCREMENT for table `complaints`
--
ALTER TABLE `complaints`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=28;

--
-- AUTO_INCREMENT for table `drivers`
--
ALTER TABLE `drivers`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=48;

--
-- AUTO_INCREMENT for table `evaluations_app`
--
ALTER TABLE `evaluations_app`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=25;

--
-- AUTO_INCREMENT for table `evaluations_travel`
--
ALTER TABLE `evaluations_travel`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=20;

--
-- AUTO_INCREMENT for table `transaction_logs`
--
ALTER TABLE `transaction_logs`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `buses`
--
ALTER TABLE `buses`
  ADD CONSTRAINT `buses_ibfk_1` FOREIGN KEY (`current_driver_id`) REFERENCES `drivers` (`id`) ON DELETE SET NULL;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
