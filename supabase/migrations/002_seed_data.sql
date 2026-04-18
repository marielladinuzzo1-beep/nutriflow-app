-- ============================================================
-- NutriFlow - Dati seed: alimenti base italiani (CREA + comuni)
-- Esegui DOPO 001_initial_schema.sql
-- ============================================================

INSERT INTO public.foods (name, category, source, kcal_100g, protein_100g, carbs_100g, fat_100g, fiber_100g, is_verified) VALUES

-- Cereali e derivati
('Pasta di semola cotta', 'Cereali', 'crea', 157, 5.8, 30.6, 0.9, 1.8, true),
('Riso bianco cotto', 'Cereali', 'crea', 138, 2.7, 30.3, 0.3, 0.3, true),
('Pane comune', 'Cereali', 'crea', 269, 8.1, 53.8, 0.9, 3.8, true),
('Pane integrale', 'Cereali', 'crea', 243, 8.5, 46.0, 1.4, 6.5, true),
('Farina 00', 'Cereali', 'crea', 341, 10.9, 72.8, 1.4, 2.2, true),
('Farina integrale', 'Cereali', 'crea', 328, 11.9, 64.6, 2.9, 9.6, true),
('Fiocchi di avena', 'Cereali', 'crea', 372, 13.5, 60.8, 7.1, 9.4, true),
('Riso integrale cotto', 'Cereali', 'crea', 123, 2.6, 25.6, 1.0, 1.8, true),

-- Carni
('Petto di pollo', 'Carni', 'crea', 110, 23.3, 0.0, 1.2, 0.0, true),
('Coscio di pollo', 'Carni', 'crea', 187, 16.4, 0.0, 13.2, 0.0, true),
('Manzo magro (fesa)', 'Carni', 'crea', 134, 21.3, 0.0, 5.0, 0.0, true),
('Maiale (lonza)', 'Carni', 'crea', 136, 21.0, 0.0, 5.4, 0.0, true),
('Tacchino petto', 'Carni', 'crea', 107, 24.0, 0.0, 0.7, 0.0, true),
('Salmone', 'Pesce', 'crea', 185, 18.4, 0.0, 12.0, 0.0, true),
('Tonno in scatola (al naturale)', 'Pesce', 'crea', 103, 23.5, 0.0, 0.5, 0.0, true),
('Merluzzo', 'Pesce', 'crea', 82, 17.0, 0.0, 0.9, 0.0, true),
('Branzino', 'Pesce', 'crea', 90, 16.5, 0.2, 2.4, 0.0, true),

-- Latticini
('Uovo intero', 'Uova', 'crea', 143, 12.4, 0.3, 9.9, 0.0, true),
('Latte parzialmente scremato', 'Latticini', 'crea', 46, 3.5, 4.9, 1.6, 0.0, true),
('Yogurt greco 0%', 'Latticini', 'crea', 57, 9.9, 3.6, 0.4, 0.0, true),
('Yogurt bianco intero', 'Latticini', 'crea', 66, 3.5, 4.5, 3.5, 0.0, true),
('Mozzarella di latte vaccino', 'Latticini', 'crea', 253, 18.7, 2.2, 19.5, 0.0, true),
('Ricotta vaccina', 'Latticini', 'crea', 146, 11.3, 3.5, 9.5, 0.0, true),
('Parmigiano reggiano', 'Latticini', 'crea', 392, 33.5, 0.0, 28.1, 0.0, true),
('Pecorino romano', 'Latticini', 'crea', 388, 26.0, 0.5, 31.6, 0.0, true),

-- Legumi
('Lenticchie cotte', 'Legumi', 'crea', 116, 9.0, 20.1, 0.4, 3.7, true),
('Ceci cotti', 'Legumi', 'crea', 164, 8.9, 27.4, 2.6, 7.6, true),
('Fagioli borlotti cotti', 'Legumi', 'crea', 123, 8.7, 20.5, 0.5, 7.8, true),
('Piselli freschi', 'Legumi', 'crea', 69, 5.0, 10.6, 0.2, 5.7, true),
('Edamame', 'Legumi', 'crea', 122, 11.9, 8.9, 5.2, 5.2, true),

-- Verdure
('Spinaci crudi', 'Verdure', 'crea', 31, 3.4, 1.6, 0.7, 2.2, true),
('Broccoli crudi', 'Verdure', 'crea', 34, 2.8, 5.6, 0.4, 2.6, true),
('Pomodori', 'Verdure', 'crea', 17, 1.2, 3.2, 0.2, 1.0, true),
('Carote', 'Verdure', 'crea', 35, 0.9, 7.9, 0.2, 2.4, true),
('Zucchine', 'Verdure', 'crea', 19, 1.3, 3.1, 0.1, 1.0, true),
('Insalata mista', 'Verdure', 'crea', 14, 1.2, 1.9, 0.2, 1.5, true),
('Peperoni', 'Verdure', 'crea', 26, 0.9, 5.3, 0.3, 1.5, true),
('Cetrioli', 'Verdure', 'crea', 14, 0.7, 2.5, 0.1, 0.6, true),
('Cavolfiore', 'Verdure', 'crea', 25, 1.9, 4.9, 0.3, 2.0, true),

-- Frutta
('Mela', 'Frutta', 'crea', 53, 0.3, 14.0, 0.1, 1.8, true),
('Banana', 'Frutta', 'crea', 89, 1.1, 22.8, 0.3, 2.6, true),
('Arancia', 'Frutta', 'crea', 45, 0.9, 10.6, 0.1, 1.6, true),
('Pera', 'Frutta', 'crea', 52, 0.4, 13.8, 0.1, 3.1, true),
('Uva', 'Frutta', 'crea', 67, 0.6, 17.2, 0.2, 1.5, true),
('Fragole', 'Frutta', 'crea', 30, 0.9, 7.0, 0.4, 2.0, true),
('Kiwi', 'Frutta', 'crea', 61, 1.1, 14.7, 0.5, 3.0, true),
('Avocado', 'Frutta', 'crea', 160, 2.0, 9.0, 14.7, 6.7, true),

-- Condimenti e grassi
('Olio extravergine di oliva', 'Condimenti', 'crea', 899, 0.0, 0.0, 99.9, 0.0, true),
('Burro', 'Condimenti', 'crea', 758, 0.6, 0.4, 83.4, 0.0, true),

-- Frutta secca
('Mandorle', 'Frutta secca', 'crea', 603, 21.2, 6.9, 55.8, 12.2, true),
('Noci', 'Frutta secca', 'crea', 654, 15.2, 13.7, 65.2, 6.7, true),

-- Drink
('Caffè espresso', 'Bevande', 'crea', 2, 0.2, 0.3, 0.0, 0.0, true);
